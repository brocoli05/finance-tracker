import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import GoalsClient from '@/components/GoalsClient'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <GoalsClient userEmail={user.email ?? ''} />
}
