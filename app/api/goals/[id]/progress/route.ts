import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'
import { z } from 'zod'

const progressSchema = z.object({
  amount: z.number().positive(),
})

export async function PATCH(
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
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (fetchError || !existing) {
    return Response.json({ data: null, error: 'Goal not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = progressSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { data: null, error: parsed.error.flatten().fieldErrors },
      { status: 422 }
    )
  }

  const newAmount  = Number(existing.current_amount) + parsed.data.amount
  const isAchieved = newAmount >= Number(existing.target_amount)

  const { data, error } = await supabase
    .from('goals')
    .update({ current_amount: newAmount, is_achieved: isAchieved })
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single()

  if (error) {
    return Response.json({ data: null, error: error.message }, { status: 500 })
  }

  return Response.json({ data, error: null })
}
