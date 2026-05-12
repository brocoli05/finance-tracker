'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { format, parseISO, getYear } from 'date-fns'
import Link from 'next/link'
import Navbar from './Navbar'
import PredictionCard from './PredictionCard'
import TransactionForm from './TransactionForm'
import GoalCard, { Goal } from './GoalCard'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string
  amount: number | string
  type: 'income' | 'expense'
  category: string
  subcategory?: string
  description?: string
  date: string
  mood?: 'happy' | 'stressed' | 'bored' | 'celebratory'
}

interface DateGroup {
  key: string
  label: string
  transactions: Transaction[]
}

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', stressed: '😰', bored: '😑', celebratory: '🎉',
}

function fmtAmount(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Grouping by date ─────────────────────────────────────────────────────────

function groupByDate(transactions: Transaction[]): DateGroup[] {
  const map     = new Map<string, DateGroup>()
  const nowYear = new Date().getFullYear()

  for (const tx of transactions) {
    if (!map.has(tx.date)) {
      let label = tx.date
      try {
        const d = parseISO(tx.date)
        label = getYear(d) === nowYear
          ? format(d, 'MMMM d')
          : format(d, 'MMMM d, yyyy')
      } catch {}
      map.set(tx.date, { key: tx.date, label, transactions: [] })
    }
    map.get(tx.date)!.transactions.push(tx)
  }

  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key))
}

// ─── Summary card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  variant,
}: {
  label: string
  value: number
  variant: 'income' | 'expense' | 'net'
}) {
  const colorClass =
    variant === 'income'  ? 'text-emerald-700' :
    variant === 'expense' ? 'text-rose-700' :
    value >= 0            ? 'text-emerald-700' : 'text-rose-700'
  const sign = variant === 'net' ? (value >= 0 ? '+' : '−') : ''
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide truncate">{label}</p>
      <p className={`mt-1.5 text-xl font-bold tabular-nums ${colorClass}`}>
        {sign}{fmtAmount(variant === 'net' ? Math.abs(value) : value)}
      </p>
    </div>
  )
}

// ─── Transaction row ──────────────────────────────────────────────────────────

function TransactionRow({
  tx,
  onEdit,
  onDelete,
}: {
  tx: Transaction
  onEdit: (tx: Transaction) => void
  onDelete: (tx: Transaction) => void
}) {
  return (
    <li className="group flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{tx.category}</p>
        {(tx.description || tx.subcategory) && (
          <p className="text-xs text-gray-600 truncate">
            {tx.description || tx.subcategory}
          </p>
        )}
      </div>

      {tx.mood && (
        <span className="text-base shrink-0" title={tx.mood}>
          {MOOD_EMOJI[tx.mood]}
        </span>
      )}

      <span className={`text-sm font-semibold tabular-nums shrink-0 ${
        tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
      }`}>
        {tx.type === 'income' ? '+' : '−'}{fmtAmount(Number(tx.amount))}
      </span>

      <div className="flex items-center gap-0.5 shrink-0">
        <button
          onClick={() => onEdit(tx)}
          title="Edit"
          className="p-1.5 rounded-md text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(tx)}
          title="Delete"
          className="p-1.5 rounded-md text-gray-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </li>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function TransactionSkeleton() {
  return (
    <div className="animate-pulse space-y-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50">
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-2/5 rounded bg-gray-200" />
            <div className="h-2.5 w-1/4 rounded bg-gray-100" />
          </div>
          <div className="w-16 h-3 rounded bg-gray-200 shrink-0" />
        </div>
      ))}
    </div>
  )
}

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
          className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 transition-colors"
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

// ─── Confirm dialog ───────────────────────────────────────────────────────────

function ConfirmDialog({
  tx,
  loading,
  onConfirm,
  onCancel,
}: {
  tx: Transaction
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
          <h3 className="text-base font-semibold text-gray-900">Delete Transaction</h3>
          <p className="mt-1 text-sm text-gray-700">
            Delete <span className="font-semibold">{tx.category}</span> for{' '}
            <span className="font-semibold">{fmtAmount(Number(tx.amount))}</span> on {tx.date}?
            {' '}This cannot be undone.
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

// ─── Goal section skeleton ────────────────────────────────────────────────────

function GoalSkeleton() {
  return (
    <div className="flex gap-4 overflow-x-auto pb-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="w-72 shrink-0 rounded-2xl border border-gray-100 bg-white p-5 animate-pulse space-y-4">
          <div className="h-4 w-2/3 rounded bg-gray-200" />
          <div className="h-3 w-1/3 rounded bg-gray-100" />
          <div className="h-2 w-full rounded-full bg-gray-100" />
        </div>
      ))}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const router = useRouter()

  const [modalOpen, setModalOpen]         = useState(false)
  const [editingTx, setEditingTx]         = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx]       = useState<Transaction | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError]     = useState<string | null>(null)
  const [refreshKey, setRefreshKey]       = useState(0)
  const [transactions, setTransactions]   = useState<Transaction[]>([])
  const [txLoading, setTxLoading]         = useState(true)
  const [goals, setGoals]                 = useState<Goal[]>([])
  const [goalsLoading, setGoalsLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/transactions')
      .then(r => r.json())
      .then(json => { if (json.data) setTransactions(json.data as Transaction[]) })
      .catch(() => {})
      .finally(() => setTxLoading(false))
  }, [refreshKey])

  useEffect(() => {
    fetch('/api/goals')
      .then(r => r.json())
      .then(json => { if (json.data) setGoals(json.data as Goal[]) })
      .catch(() => {})
      .finally(() => setGoalsLoading(false))
  }, [])

  function openAddModal() {
    setEditingTx(null)
    setModalOpen(true)
  }

  function openEditModal(tx: Transaction) {
    setEditingTx(tx)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setEditingTx(null)
  }

  function handleFormSuccess() {
    closeModal()
    setTxLoading(true)
    setRefreshKey(k => k + 1)
  }

  async function handleDeleteConfirm() {
    if (!deletingTx) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res  = await fetch(`/api/transactions/${deletingTx.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (!res.ok || json.error) {
        setDeleteError(typeof json.error === 'string' ? json.error : 'Delete failed.')
        return
      }
      setDeletingTx(null)
      setTxLoading(true)
      setRefreshKey(k => k + 1)
    } catch {
      setDeleteError('Network error. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // This-month summary
  const now             = new Date()
  const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthTx     = transactions.filter(tx => tx.date.startsWith(thisMonthPrefix))
  const thisMonthIncome  = thisMonthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const thisMonthExpense = thisMonthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)
  const thisMonthNet     = thisMonthIncome - thisMonthExpense

  // Recent 10 transactions grouped by date
  const recentTx   = transactions.slice(0, 10)
  const dateGroups = groupByDate(recentTx)

  // Active goals
  const activeGoals = goals.filter(g => !g.is_achieved)

  const modalTitle = editingTx ? 'Edit Transaction' : 'Add Transaction'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* 1. AI Prediction */}
        <PredictionCard key={`pred-${refreshKey}`} />

        {/* 2. Quick summary */}
        <div className="grid grid-cols-3 gap-4">
          <SummaryCard label="This Month Income"   value={thisMonthIncome}  variant="income" />
          <SummaryCard label="This Month Expenses" value={thisMonthExpense} variant="expense" />
          <SummaryCard
            label={thisMonthNet >= 0 ? 'Net Saved' : 'Net Spent'}
            value={thisMonthNet}
            variant="net"
          />
        </div>

        {/* 3. Recent transactions */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Recent Transactions
            </h2>
            <div className="flex items-center gap-3">
              <Link
                href="/transactions"
                className="text-xs font-medium text-indigo-600 hover:underline"
              >
                View all
              </Link>
              <button
                onClick={openAddModal}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
                </svg>
                Add
              </button>
            </div>
          </div>

          {txLoading ? (
            <TransactionSkeleton />
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-800">No transactions yet.</p>
              <button
                onClick={openAddModal}
                className="mt-2 text-sm text-indigo-600 hover:underline font-medium"
              >
                Add your first one
              </button>
            </div>
          ) : (
            <div className="space-y-0">
              {dateGroups.map(group => (
                <div key={group.key}>
                  <p className="pt-3 pb-1 text-xs font-semibold text-gray-700 first:pt-0">
                    {group.label}
                  </p>
                  <ul>
                    {group.transactions.map(tx => (
                      <TransactionRow
                        key={tx.id}
                        tx={tx}
                        onEdit={openEditModal}
                        onDelete={setDeletingTx}
                      />
                    ))}
                  </ul>
                </div>
              ))}
              {transactions.length > 10 && (
                <p className="pt-3 text-center">
                  <Link
                    href="/transactions"
                    className="text-xs font-medium text-indigo-600 hover:underline"
                  >
                    +{transactions.length - 10} more — view all transactions
                  </Link>
                </p>
              )}
            </div>
          )}
        </section>

        {/* 4. Active goals */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Active Goals
            </h2>
            <Link
              href="/goals"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              View all
            </Link>
          </div>

          {goalsLoading ? (
            <GoalSkeleton />
          ) : activeGoals.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-800">No active goals.</p>
              <Link
                href="/goals"
                className="mt-2 inline-block text-sm text-indigo-600 hover:underline font-medium"
              >
                Create your first goal
              </Link>
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1">
              {activeGoals.slice(0, 5).map(goal => (
                <div key={goal.id} className="w-72 shrink-0">
                  <GoalCard
                    goal={goal}
                    onEdit={() => router.push('/goals')}
                    onDelete={() => router.push('/goals')}
                    onAddSavings={() => router.push('/goals')}
                  />
                </div>
              ))}
              {activeGoals.length > 5 && (
                <div className="w-40 shrink-0 flex items-center justify-center">
                  <Link
                    href="/goals"
                    className="text-sm font-medium text-indigo-600 hover:underline"
                  >
                    +{activeGoals.length - 5} more
                  </Link>
                </div>
              )}
            </div>
          )}
        </section>

      </main>

      {/* Add / Edit modal */}
      <Modal open={modalOpen} title={modalTitle} onClose={closeModal}>
        <TransactionForm
          key={editingTx?.id ?? 'new'}
          onSuccess={handleFormSuccess}
          initialData={editingTx ?? undefined}
        />
      </Modal>

      {/* Delete confirmation */}
      {deletingTx && (
        <ConfirmDialog
          tx={deletingTx}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onCancel={() => { setDeletingTx(null); setDeleteError(null) }}
        />
      )}

      {/* Delete error toast */}
      {deleteError && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-rose-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {deleteError}
        </div>
      )}
    </div>
  )
}
