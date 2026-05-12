import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { e2eFrom } from '@/lib/e2e-store'

export async function createClient() {
  const cookieStore = await cookies()

  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — session refresh is handled by middleware
          }
        },
      },
    }
  )

  // E2E test bypass: skip the real Supabase network call and return a fake user.
  // Only active when the dev server is started with E2E_TESTING=true AND the
  // test has set the e2e_session cookie (via cy.login() or loginAsTestUser()).
  if (
    process.env.E2E_TESTING === 'true' &&
    cookieStore.get('e2e_session')?.value === 'true'
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(client.auth as any).getUser = async () => ({
      data: {
        user: {
          id: 'e2e-test-user-id',
          email: 'e2e@test.local',
          aud: 'authenticated',
          created_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
        },
      },
      error: null,
    })

    // Patch from() to use an isolated in-memory store so CRUD tests work
    // without a real Supabase session. The session ID isolates parallel tests.
    const sessionId = cookieStore.get('e2e_session_id')?.value ?? 'default'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(client as any).from = e2eFrom(sessionId)
  }

  return client
}
