'use client'

import { useEffect, useRef, useState } from 'react'
import Navbar from './Navbar'
import GoalCard, { Goal } from './GoalCard'
import GoalForm from './GoalForm'

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}) {
  const backdropRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => { if (e.target === backdropRef.current) onClose() }}
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-6 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          aria-label="Close"
        >
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
          </svg>
        </button>
        <h2 className="text-base font-semibold text-gray-900 mb-5">{title}</h2>
        {children}
      </div>
    </div>
  )
}

// ─── Delete confirm ───────────────────────────────────────────────────────────

function DeleteConfirmDialog({
  goal,
  loading,
  onConfirm,
  onCancel,
}: {
  goal: Goal
  loading: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => { if (e.currentTarget === e.target) onCancel() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Delete Goal</h3>
          <p className="mt-1 text-sm text-gray-700">
            Delete <span className="font-semibold">{goal.title}</span>? This cannot be undone.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Add savings dialog ───────────────────────────────────────────────────────

function AddSavingsDialog({
  goal,
  loading,
  onConfirm,
  onCancel,
}: {
  goal: Goal
  loading: boolean
  onConfirm: (amount: number) => void
  onCancel: () => void
}) {
  const [amount, setAmount] = useState('')
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    const n = parseFloat(amount)
    if (isNaN(n) || n <= 0) {
      setError('Enter a positive amount.')
      return
    }
    onConfirm(n)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onMouseDown={(e) => { if (e.currentTarget === e.target) onCancel() }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-xl p-6 space-y-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Add Savings</h3>
          <p className="mt-1 text-sm text-gray-700">
            Adding toward: <span className="font-semibold">{goal.title}</span>
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>
          </div>
          {error && (
            <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {loading ? 'Saving…' : 'Add Savings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function GoalSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-gray-100 bg-white p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-2/5 rounded bg-gray-200" />
              <div className="h-3 w-1/4 rounded bg-gray-100" />
            </div>
            <div className="flex gap-1">
              <div className="h-6 w-6 rounded bg-gray-100" />
              <div className="h-6 w-6 rounded bg-gray-100" />
            </div>
          </div>
          <div className="flex justify-between">
            <div className="h-4 w-1/3 rounded bg-gray-200" />
            <div className="h-4 w-8 rounded bg-gray-100" />
          </div>
          <div className="h-2 w-full rounded-full bg-gray-100" />
          <div className="h-9 w-full rounded-lg bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// ─── Goals client ─────────────────────────────────────────────────────────────

export default function GoalsClient({ userEmail }: { userEmail: string }) {
  const [goals, setGoals]             = useState<Goal[]>([])
  const [loading, setLoading]         = useState(true)
  const [refreshKey, setRefreshKey]   = useState(0)

  const [modalOpen, setModalOpen]     = useState(false)
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)

  const [deletingGoal, setDeletingGoal]     = useState<Goal | null>(null)
  const [deleteLoading, setDeleteLoading]   = useState(false)
  const [deleteError, setDeleteError]       = useState<string | null>(null)

  const [savingsGoal, setSavingsGoal]         = useState<Goal | null>(null)
  const [savingsLoading, setSavingsLoading]   = useState(false)
  const [savingsError, setSavingsError]       = useState<string | null>(null)

  const [achievedOpen, setAchievedOpen] = useState(false)

  useEffect(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then(json => { if (json.data) setGoals(json.data as Goal[]) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey])

  function openAddModal() {
    setEditingGoal(null)
    setModalOpen(true)
  }

  function openEditModal(goal: Goal) {
    setEditingGoal(goal)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingGoal(null)
  }

  function handleFormSuccess() {
    closeModal()
    setLoading(true)
    setRefreshKey(k => k + 1)
  }

  async function handleDeleteConfirm() {
    if (!deletingGoal) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res  = await fetch(`/api/goals/${deletingGoal.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || json.error) {
        setDeleteError(typeof json.error === 'string' ? json.error : 'Delete failed.')
        return
      }
      setDeletingGoal(null)
      setLoading(true)
      setRefreshKey(k => k + 1)
    } catch {
      setDeleteError('Network error. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleAddSavings(amount: number) {
    if (!savingsGoal) return
    setSavingsLoading(true)
    setSavingsError(null)
    try {
      const res  = await fetch(`/api/goals/${savingsGoal.id}/progress`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ amount }),
      })
      const json = await res.json()
      if (!res.ok || json.error) {
        setSavingsError(typeof json.error === 'string' ? json.error : 'Update failed.')
        return
      }
      setSavingsGoal(null)
      setLoading(true)
      setRefreshKey(k => k + 1)
    } catch {
      setSavingsError('Network error. Please try again.')
    } finally {
      setSavingsLoading(false)
    }
  }

  const active   = goals.filter(g => !g.is_achieved)
  const achieved = goals.filter(g => g.is_achieved)
  const modalTitle = editingGoal ? 'Edit Goal' : 'Add Goal'

  return (
    <div className="min-h-screen bg-gray-50">

      <Navbar userEmail={userEmail} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Goals</h1>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
            </svg>
            Add Goal
          </button>
        </div>

        {/* Active goals */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">
            Active Goals
          </h2>

          {loading ? (
            <GoalSkeleton />
          ) : active.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-700">No active goals yet.</p>
              <button
                onClick={openAddModal}
                className="mt-2 text-sm text-indigo-600 hover:underline font-medium"
              >
                Create your first goal
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {active.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={openEditModal}
                  onDelete={setDeletingGoal}
                  onAddSavings={setSavingsGoal}
                />
              ))}
            </div>
          )}
        </section>

        {/* Achieved goals (collapsible) */}
        {achieved.length > 0 && (
          <section className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
            <button
              onClick={() => setAchievedOpen(o => !o)}
              className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
            >
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
                Achieved Goals
                <span className="ml-2 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full normal-case">
                  {achieved.length}
                </span>
              </h2>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${achievedOpen ? 'rotate-180' : ''}`}
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>

            {achievedOpen && (
              <div className="px-6 pb-6 space-y-4">
                {achieved.map(goal => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={openEditModal}
                    onDelete={setDeletingGoal}
                    onAddSavings={setSavingsGoal}
                  />
                ))}
              </div>
            )}
          </section>
        )}

      </main>

      {/* Add / Edit modal */}
      <Modal open={modalOpen} title={modalTitle} onClose={closeModal}>
        <GoalForm
          key={editingGoal?.id ?? 'new'}
          onSuccess={handleFormSuccess}
          initialData={editingGoal ?? undefined}
        />
      </Modal>

      {/* Delete confirm */}
      {deletingGoal && (
        <DeleteConfirmDialog
          goal={deletingGoal}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeletingGoal(null); setDeleteError(null) }}
        />
      )}

      {/* Add savings dialog */}
      {savingsGoal && (
        <AddSavingsDialog
          goal={savingsGoal}
          loading={savingsLoading}
          onConfirm={handleAddSavings}
          onCancel={() => { setSavingsGoal(null); setSavingsError(null) }}
        />
      )}

      {/* Error toasts */}
      {deleteError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {deleteError}
        </div>
      )}
      {savingsError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {savingsError}
        </div>
      )}

    </div>
  )
}
