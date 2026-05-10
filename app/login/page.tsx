'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Mode = 'signin' | 'signup'

const E2E_EMAIL    = process.env.NEXT_PUBLIC_TEST_USER_EMAIL    ?? 'e2e-test@example.com'
const E2E_PASSWORD = process.env.NEXT_PUBLIC_TEST_USER_PASSWORD ?? 'testpassword123'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode]         = useState<Mode>('signin')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [notice, setNotice]     = useState<string | null>(null)

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
    setNotice(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    setLoading(true)

    const supabase = createClient()

    try {
      if (mode === 'signin') {
        // E2E bypass: skip Supabase and use the cookie-based session stub
        if (
          process.env.NEXT_PUBLIC_E2E_TESTING === 'true' &&
          email === E2E_EMAIL &&
          password === E2E_PASSWORD
        ) {
          const res = await fetch('/api/e2e/login', { method: 'POST' })
          if (res.ok) { router.replace('/'); return }
        }
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) { setError(error.message); return }
        router.replace('/')
      } else {
        const { data, error } = await supabase.auth.signUp({ email, password })
        if (error) { setError(error.message); return }

        // If Supabase email confirmation is enabled, session is null after sign-up
        if (data.session) {
          router.replace('/')
        } else {
          // Don't call switchMode() here — it would clear the notice we're about to set
          setMode('signin')
          setError(null)
          setNotice('Check your email to confirm your account, then sign in.')
        }
      }
    } finally {
      setLoading(false)
    }
  }

  const isSignIn = mode === 'signin'

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-3xl font-bold tracking-tight text-indigo-600">
            SpendSight
          </span>
          <p className="mt-1 text-sm text-gray-500">
            {isSignIn ? 'Sign in to your account' : 'Create a new account'}
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-8 space-y-5">

          {/* Mode tabs */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm font-medium">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className={`flex-1 py-2 transition-colors capitalize ${
                  mode === m
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-500 hover:bg-gray-50'
                }`}
              >
                {m === 'signin' ? 'Sign in' : 'Sign up'}
              </button>
            ))}
          </div>

          {/* Notice (e.g. confirm email) */}
          {notice && (
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5 text-sm text-emerald-700">
              {notice}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2.5 text-sm text-rose-600">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                autoComplete={isSignIn ? 'current-password' : 'new-password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
              {!isSignIn && (
                <p className="mt-1 text-xs text-gray-600">Minimum 6 characters</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {loading
                ? isSignIn ? 'Signing in…' : 'Creating account…'
                : isSignIn ? 'Sign in' : 'Create account'}
            </button>
          </form>

          {/* Toggle link */}
          <p className="text-center text-xs text-gray-500">
            {isSignIn ? "Don't have an account? " : 'Already have an account? '}
            <button
              type="button"
              onClick={() => switchMode(isSignIn ? 'signup' : 'signin')}
              className="text-indigo-600 hover:underline font-medium"
            >
              {isSignIn ? 'Sign up' : 'Sign in'}
            </button>
          </p>

        </div>
      </div>
    </div>
  )
}
