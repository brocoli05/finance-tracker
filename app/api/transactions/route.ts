import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const transactionSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  date: z.string().min(1),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  mood: z.enum(['happy', 'stressed', 'bored', 'celebratory']).optional(),
})

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .order('date', { ascending: false })

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }

  return Response.json({ data, error: null })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = transactionSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert({ ...parsed.data, user_id: user.id })
    .select()
    .single()

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }

  return Response.json({ data, error: null }, { status: 201 })
}
