import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ChartsLayout from '@/components/ChartsLayout'

export const dynamic = 'force-dynamic'

export default async function Page() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return <ChartsLayout userEmail={user.email ?? ''} />
}
