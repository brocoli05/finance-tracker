'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const NAV_LINKS = [
  { href: '/',             label: 'Dashboard'    },
  { href: '/transactions', label: 'Transactions' },
  { href: '/goals',        label: 'Goals'        },
  { href: '/charts',       label: 'Charts'       },
]

export default function Navbar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <span className="text-lg font-bold tracking-tight text-indigo-600">SpendSight</span>
          <nav className="hidden sm:flex items-center gap-0.5">
            {NAV_LINKS.map(link => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-700 hover:text-indigo-600 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700 hidden md:block truncate max-w-[200px]">
            {userEmail}
          </span>
          <button
            onClick={signOut}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  )
}
