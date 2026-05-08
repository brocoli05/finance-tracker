'use client'

import Navbar from './Navbar'
import Charts from './Charts'

export default function ChartsLayout({ userEmail }: { userEmail: string }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-5">Charts</h1>
        <Charts />
      </main>
    </div>
  )
}
