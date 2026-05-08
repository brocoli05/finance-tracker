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

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return Response.json({ data: null, error: 'Transaction not found' }, { status: 404 })
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
    .update(parsed.data)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }

  return Response.json({ data, error: null })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  // RLS enforces ownership, but the explicit eq user_id gives a clear 404 vs 500
  const { data: existing, error: fetchError } = await supabase
    .from('transactions')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return Response.json({ data: null, error: 'Transaction not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }

  return Response.json({ data: { id }, error: null })
}
