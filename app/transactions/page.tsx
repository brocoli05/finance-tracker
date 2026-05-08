import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TransactionsClient from '@/components/TransactionsClient'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <TransactionsClient userEmail={user.email ?? ''} />
}
