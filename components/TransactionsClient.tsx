'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import Navbar from './Navbar'
import TransactionForm from './TransactionForm'

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

interface MonthGroup {
  key: string
  label: string
  transactions: Transaction[]
  income: number
  expense: number
  net: number
}

const INCOME_CATEGORIES = ['Payroll', 'Stock Investment', 'Part-time tip', 'Other']
const EXPENSE_CATEGORIES = ['Rent', 'Utilities', 'Phone', 'Food', 'Clothes', 'Electronics', 'Gifts', 'Travel', 'Hobbies', 'Other']
const ALL_CATEGORIES = [...new Set([...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES])].sort()

const MOOD_EMOJI: Record<string, string> = {
  happy: '😊', stressed: '😰', bored: '😑', celebratory: '🎉',
}

function fmtAmount(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Grouping ─────────────────────────────────────────────────────────────────

function groupByMonth(transactions: Transaction[]): MonthGroup[] {
  const map = new Map<string, MonthGroup>()

  for (const tx of transactions) {
    const [year, month] = tx.date.split('-')
    const key = `${year}-${month}`

    if (!map.has(key)) {
      let monthName = month
      try { monthName = format(parseISO(`${year}-${month}-01`), 'MMMM') } catch {}
      map.set(key, { key, label: `${year} / ${monthName}`, transactions: [], income: 0, expense: 0, net: 0 })
    }

    const g = map.get(key)!
    g.transactions.push(tx)
    const amt = Number(tx.amount)
    if (tx.type === 'income') { g.income += amt; g.net += amt }
    else                      { g.expense += amt; g.net -= amt }
  }

  return Array.from(map.values()).sort((a, b) => b.key.localeCompare(a.key))
}

// ─── Month header ─────────────────────────────────────────────────────────────

function MonthHeader({ group }: { group: MonthGroup }) {
  const netPositive = group.net >= 0
  return (
    <div className="flex items-center justify-between pt-6 pb-2 border-b border-gray-200 first:pt-0">
      <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
        {group.label}
      </h3>
      <div className="flex items-center gap-3 text-xs font-medium tabular-nums">
        {group.income > 0 && (
          <span className="text-emerald-700">+{fmtAmount(group.income)}</span>
        )}
        {group.expense > 0 && (
          <span className="text-rose-700">−{fmtAmount(group.expense)}</span>
        )}
        <span className={`font-bold ${netPositive ? 'text-emerald-800' : 'text-rose-800'}`}>
          {netPositive ? '+' : '−'}{fmtAmount(Math.abs(group.net))}
        </span>
      </div>
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
  let dateDisplay = tx.date
  try { dateDisplay = format(parseISO(tx.date), 'MMM d') } catch {}

  return (
    <li className="group flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
      <span className="w-11 shrink-0 text-xs font-medium text-gray-700">{dateDisplay}</span>

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
      <div className="h-4 w-32 rounded bg-gray-200 mb-3" />
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-3 border-b border-gray-50">
          <div className="w-11 h-3 rounded bg-gray-200 shrink-0" />
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

// ─── Main component ───────────────────────────────────────────────────────────

export default function TransactionsClient({ userEmail }: { userEmail: string }) {
  const [transactions, setTransactions]   = useState<Transaction[]>([])
  const [loading, setLoading]             = useState(true)
  const [refreshKey, setRefreshKey]       = useState(0)
  const [modalOpen, setModalOpen]         = useState(false)
  const [editingTx, setEditingTx]         = useState<Transaction | null>(null)
  const [deletingTx, setDeletingTx]       = useState<Transaction | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError]     = useState<string | null>(null)

  // Filter state
  const [filterType, setFilterType]         = useState<'all' | 'income' | 'expense'>('all')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterFrom, setFilterFrom]         = useState<string>('')
  const [filterTo, setFilterTo]             = useState<string>('')

  useEffect(() => {
    fetch('/api/transactions')
      .then(r => r.json())
      .then(json => { if (json.data) setTransactions(json.data as Transaction[]) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [refreshKey])

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
    setLoading(true)
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
      setLoading(true)
      setRefreshKey(k => k + 1)
    } catch {
      setDeleteError('Network error. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      if (filterType !== 'all' && tx.type !== filterType) return false
      if (filterCategory && tx.category !== filterCategory) return false
      if (filterFrom && tx.date < filterFrom) return false
      if (filterTo && tx.date > filterTo) return false
      return true
    })
  }, [transactions, filterType, filterCategory, filterFrom, filterTo])

  const groups = groupByMonth(filtered)

  const hasFilters = filterType !== 'all' || filterCategory || filterFrom || filterTo

  function clearFilters() {
    setFilterType('all')
    setFilterCategory('')
    setFilterFrom('')
    setFilterTo('')
  }

  const modalTitle = editingTx ? 'Edit Transaction' : 'Add Transaction'

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar userEmail={userEmail} />

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">Transactions</h1>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" />
            </svg>
            Add Transaction
          </button>
        </div>

        {/* Filter bar */}
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap gap-3 items-end">

            {/* Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Type</label>
              <div className="flex rounded-lg border border-gray-200 p-0.5 gap-0.5">
                {(['all', 'income', 'expense'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                      filterType === t
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">Category</label>
              <select
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                className="h-[30px] px-2 text-xs border border-gray-200 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              >
                <option value="">All categories</option>
                {ALL_CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Date from */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">From</label>
              <input
                type="date"
                value={filterFrom}
                onChange={e => setFilterFrom(e.target.value)}
                className="h-[30px] px-2 text-xs border border-gray-200 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {/* Date to */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-700">To</label>
              <input
                type="date"
                value={filterTo}
                onChange={e => setFilterTo(e.target.value)}
                className="h-[30px] px-2 text-xs border border-gray-200 rounded-lg text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
              />
            </div>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="h-[30px] px-3 text-xs font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors self-end"
              >
                Clear filters
              </button>
            )}

            <span className="text-xs text-gray-700 self-end ml-auto">
              {filtered.length} transaction{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Transaction list */}
        <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          {loading ? (
            <TransactionSkeleton />
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-800">
                {hasFilters ? 'No transactions match your filters.' : 'No transactions yet.'}
              </p>
              {!hasFilters && (
                <button
                  onClick={openAddModal}
                  className="mt-2 text-sm text-indigo-600 hover:underline font-medium"
                >
                  Add your first one
                </button>
              )}
            </div>
          ) : (
            <div>
              {groups.map(group => (
                <div key={group.key}>
                  <MonthHeader group={group} />
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
