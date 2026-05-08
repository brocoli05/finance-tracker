import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const goalSchema = z.object({
  title: z.string().min(1),
  target_amount: z.number().positive(),
  deadline: z.string().min(1),
  category: z.string().min(1),
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
    .from('goals')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return Response.json({ data: null, error: 'Goal not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = goalSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const { data, error } = await supabase
    .from('goals')
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

  const { data: existing, error: fetchError } = await supabase
    .from('goals')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return Response.json({ data: null, error: 'Goal not found' }, { status: 404 })
  }

  const { error } = await supabase
    .from('goals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }

  return Response.json({ data: { id }, error: null })
}
