import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST() {
  if (process.env.E2E_TESTING !== 'true') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sessionId = crypto.randomUUID()
  const cookieStore = await cookies()
  cookieStore.set('e2e_session', 'true', { path: '/', maxAge: 3600, httpOnly: false })
  cookieStore.set('e2e_session_id', sessionId, { path: '/', maxAge: 3600, httpOnly: false })

  return NextResponse.json({ ok: true })
}
