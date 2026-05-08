'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import {
  subDays,
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  subWeeks,
  startOfMonth,
  subMonths,
  getYear,
  eachDayOfInterval,
  isWithinInterval,
  startOfDay,
} from 'date-fns'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  id: string
  amount: number | string
  type: 'income' | 'expense'
  category: string
  subcategory?: string
  description?: string
  date: string
  mood?: string
}

interface ChartPoint {
  label: string
  income: number
  expense: number
  net: number
}

interface PieEntry {
  name: string
  value: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = ['Daily', 'Weekly', 'Monthly', 'Yearly'] as const
type Period = (typeof PERIODS)[number]

const PIE_COLORS = [
  '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6',
  '#22c55e', '#eab308', '#f97316', '#ef4444',
  '#ec4899', '#8b5cf6',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmt(n: number): string {
  return `$${Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

function yFmt(v: number): string {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v}`
}

function sum(txs: Transaction[], type: 'income' | 'expense'): number {
  return txs.filter(t => t.type === type).reduce((s, t) => s + Number(t.amount), 0)
}

// ─── Chart data builders ───────────────────────────────────────────────────────

function buildDailyData(transactions: Transaction[]): ChartPoint[] {
  const today = new Date()
  const days = eachDayOfInterval({ start: subDays(today, 29), end: today })
  return days.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const dayTx = transactions.filter(tx => tx.date === dateStr)
    const income = sum(dayTx, 'income')
    const expense = sum(dayTx, 'expense')
    return { label: format(day, 'MM/dd'), income, expense, net: income - expense }
  })
}

function buildWeeklyData(transactions: Transaction[]): ChartPoint[] {
  const today = new Date()
  const points: ChartPoint[] = []
  for (let i = 11; i >= 0; i--) {
    const ref = subWeeks(today, i)
    const weekStart = startOfWeek(ref, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(ref, { weekStartsOn: 0 })
    const weekTx = transactions.filter(tx =>
      isWithinInterval(parseISO(tx.date), { start: weekStart, end: weekEnd }),
    )
    const income = sum(weekTx, 'income')
    const expense = sum(weekTx, 'expense')
    points.push({ label: format(weekStart, 'MM/dd'), income, expense, net: income - expense })
  }
  return points
}

function buildMonthlyData(transactions: Transaction[]): ChartPoint[] {
  const today = new Date()
  const points: ChartPoint[] = []
  for (let i = 11; i >= 0; i--) {
    const monthStart = startOfMonth(subMonths(today, i))
    const monthKey = format(monthStart, 'yyyy-MM')
    const monthTx = transactions.filter(tx => tx.date.startsWith(monthKey))
    const income = sum(monthTx, 'income')
    const expense = sum(monthTx, 'expense')
    points.push({
      label: format(monthStart, 'MMM') + " '" + format(monthStart, 'yy'),
      income,
      expense,
      net: income - expense,
    })
  }
  return points
}

function buildYearlyData(transactions: Transaction[]): ChartPoint[] {
  if (!transactions.length) return []
  const years = [...new Set(transactions.map(tx => getYear(parseISO(tx.date))))].sort()
  return years.map(year => {
    const yearTx = transactions.filter(tx => tx.date.startsWith(`${year}-`))
    const income = sum(yearTx, 'income')
    const expense = sum(yearTx, 'expense')
    return { label: `${year}`, income, expense, net: income - expense }
  })
}

function getPeriodTransactions(transactions: Transaction[], period: Period): Transaction[] {
  const today = new Date()
  if (period === 'Daily') {
    const start = startOfDay(subDays(today, 29))
    return transactions.filter(tx => parseISO(tx.date) >= start)
  }
  if (period === 'Weekly') {
    const start = startOfWeek(subWeeks(today, 11), { weekStartsOn: 0 })
    return transactions.filter(tx => parseISO(tx.date) >= start)
  }
  if (period === 'Monthly') {
    const start = startOfMonth(subMonths(today, 11))
    return transactions.filter(tx => parseISO(tx.date) >= start)
  }
  return transactions
}

// ─── Custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const income  = payload.find(p => p.dataKey === 'income')
  const expense = payload.find(p => p.dataKey === 'expense')
  const net     = payload.find(p => p.dataKey === 'net')
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-sm space-y-1">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {income  && <p className="text-emerald-600">Income: <span className="font-medium">{fmtAmt(income.value)}</span></p>}
      {expense && <p className="text-blue-600">Expenses: <span className="font-medium">{fmtAmt(expense.value)}</span></p>}
      {net && (
        <p className={net.value >= 0 ? 'text-purple-600' : 'text-rose-600'}>
          Net: <span className="font-medium">{net.value >= 0 ? '+' : '−'}{fmtAmt(net.value)}</span>
        </p>
      )}
    </div>
  )
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
    variant === 'expense' ? 'text-blue-700' :
    value >= 0            ? 'text-emerald-700' : 'text-rose-700'
  const sign = variant === 'net' ? (value >= 0 ? '+' : '−') : ''
  return (
    <div className="flex-1 min-w-0 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-gray-700 uppercase tracking-wide truncate">{label}</p>
      <p className={`mt-1 text-xl font-bold tabular-nums ${colorClass}`}>
        {sign}{fmtAmt(value)}
      </p>
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="flex gap-3">
        {[0, 1, 2].map(i => <div key={i} className="flex-1 h-20 rounded-xl bg-gray-100" />)}
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="flex gap-2">
            {[0, 1, 2, 3].map(i => <div key={i} className="h-7 w-16 rounded-lg bg-gray-200" />)}
            <div className="h-7 w-24 rounded-lg bg-gray-200" />
          </div>
        </div>
        <div className="h-72 rounded-xl bg-gray-100" />
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div className="h-64 rounded-2xl bg-gray-100" />
        <div className="h-64 rounded-2xl bg-gray-100" />
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Charts() {
  const [transactions, setTransactions]           = useState<Transaction[]>([])
  const [loading, setLoading]                     = useState(true)
  const [error, setError]                         = useState<string | null>(null)
  const [period, setPeriod]                       = useState<Period>('Monthly')
  const [activePieCategory, setActivePieCategory] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/transactions')
      .then(r => r.json())
      .then(json => {
        if (json.error) {
          setError(typeof json.error === 'string' ? json.error : 'Failed to load transactions')
          return
        }
        setTransactions(json.data ?? [])
      })
      .catch(() => setError('Network error. Please try again.'))
      .finally(() => setLoading(false))
  }, [])

  const chartData = useMemo((): ChartPoint[] => {
    if (period === 'Daily')   return buildDailyData(transactions)
    if (period === 'Weekly')  return buildWeeklyData(transactions)
    if (period === 'Monthly') return buildMonthlyData(transactions)
    return buildYearlyData(transactions)
  }, [transactions, period])

  const periodTransactions = useMemo(
    () => getPeriodTransactions(transactions, period),
    [transactions, period],
  )

  const summary = useMemo(() => {
    const totalIncome  = chartData.reduce((s, d) => s + d.income, 0)
    const totalExpense = chartData.reduce((s, d) => s + d.expense, 0)
    return { totalIncome, totalExpense, net: totalIncome - totalExpense }
  }, [chartData])

  const pieData = useMemo((): PieEntry[] => {
    const map = new Map<string, number>()
    for (const tx of periodTransactions) {
      if (tx.type !== 'expense') continue
      map.set(tx.category, (map.get(tx.category) ?? 0) + Number(tx.amount))
    }
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [periodTransactions])

  const filteredTransactions = useMemo(() => {
    const sorted = [...periodTransactions].sort((a, b) => b.date.localeCompare(a.date))
    if (!activePieCategory) return sorted
    return sorted.filter(tx => tx.category === activePieCategory)
  }, [periodTransactions, activePieCategory])

  function handlePieClick(entry: { name?: string }) {
    if (!entry.name) return
    setActivePieCategory(prev => (prev === entry.name ? null : entry.name!))
  }

  function exportCSV() {
    const header = ['date', 'type', 'category', 'subcategory', 'description', 'amount']
    const rows = [...periodTransactions]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(tx => [
        tx.date,
        tx.type,
        tx.category,
        tx.subcategory ?? '',
        (tx.description ?? '').replace(/,/g, ' '),
        Number(tx.amount).toFixed(2),
      ])
    const csv = [header, ...rows].map(r => r.join(',')).join('\n')

    const now = new Date()
    const filename =
      period === 'Monthly'
        ? `transaction_${format(now, 'yyyy')}_${format(now, 'MMMM').toLowerCase()}.csv`
        : `transaction_${format(now, 'yyyy')}_${period.toLowerCase()}.csv`

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) return <Skeleton />

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-600">
        {error}
      </div>
    )
  }

  // Show ~8 X-axis ticks regardless of period length
  const tickInterval = Math.max(0, Math.floor(chartData.length / 8) - 1)
  const pieTotal = pieData.reduce((s, d) => s + d.value, 0)

  return (
    <div className="space-y-5">

      {/* ── Summary cards ───────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <SummaryCard label="Total Income"   value={summary.totalIncome}  variant="income" />
        <SummaryCard label="Total Expenses" value={summary.totalExpense} variant="expense" />
        <SummaryCard
          label={summary.net >= 0 ? 'Net Saved' : 'Net Spent'}
          value={summary.net}
          variant="net"
        />
      </div>

      {/* ── Main chart ──────────────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Analytics</h2>

          <div className="flex items-center gap-2">
            {/* Period tabs */}
            <div className="flex rounded-lg border border-gray-200 p-0.5 gap-0.5">
              {PERIODS.map(p => (
                <button
                  key={p}
                  onClick={() => { setPeriod(p); setActivePieCategory(null) }}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                    period === p
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            {/* Export button */}
            <button
              onClick={exportCSV}
              disabled={periodTransactions.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {chartData.every(d => d.income === 0 && d.expense === 0) ? (
          <div className="flex items-center justify-center h-72 text-sm text-gray-600">
            No data for this period
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                interval={tickInterval}
              />
              <YAxis
                tickFormatter={yFmt}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                iconType="square"
                iconSize={10}
                wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
                formatter={(value: string) =>
                  value === 'income' ? 'Income' : value === 'expense' ? 'Expenses' : 'Net Savings'
                }
              />
              {/* Blue bars — expenses */}
              <Bar
                dataKey="expense"
                fill="#3b82f6"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
              {/* Green bars — income */}
              <Bar
                dataKey="income"
                fill="#22c55e"
                radius={[3, 3, 0, 0]}
                maxBarSize={28}
                isAnimationActive={false}
              />
              {/* Purple line — net savings */}
              <Line
                dataKey="net"
                stroke="#8b5cf6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: '#8b5cf6' }}
                connectNulls
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Category breakdown + transaction list ──────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">

        {/* Pie chart */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
              Expense Breakdown
            </h2>
            {activePieCategory && (
              <button
                onClick={() => setActivePieCategory(null)}
                className="text-xs text-indigo-600 hover:underline font-medium"
              >
                Clear filter
              </button>
            )}
          </div>

          {pieData.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-600">
              No expense data
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={88}
                    paddingAngle={2}
                    onClick={handlePieClick}
                  >
                    {pieData.map((entry, i) => (
                      <Cell
                        key={entry.name}
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                        opacity={
                          activePieCategory && activePieCategory !== entry.name ? 0.25 : 1
                        }
                        style={{ cursor: 'pointer', outline: 'none' }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => [fmtAmt(value as number), 'Amount']}
                    contentStyle={{
                      borderRadius: 8,
                      fontSize: 12,
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Pie legend */}
              <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                {pieData.map((entry, i) => {
                  const pct = pieTotal > 0 ? ((entry.value / pieTotal) * 100).toFixed(1) : '0'
                  const isActive = activePieCategory === entry.name
                  const isDimmed = activePieCategory !== null && !isActive
                  return (
                    <button
                      key={entry.name}
                      onClick={() => setActivePieCategory(p => (p === entry.name ? null : entry.name))}
                      className={`w-full flex items-center gap-2 text-xs text-left px-1.5 py-1 rounded-md transition-colors ${
                        isActive ? 'bg-indigo-50' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0 transition-opacity"
                        style={{
                          backgroundColor: PIE_COLORS[i % PIE_COLORS.length],
                          opacity: isDimmed ? 0.3 : 1,
                        }}
                      />
                      <span className={`flex-1 truncate ${isDimmed ? 'text-gray-500' : 'text-gray-800'}`}>
                        {entry.name}
                      </span>
                      <span className={`tabular-nums ${isDimmed ? 'text-gray-400' : 'text-gray-700'}`}>
                        {pct}%
                      </span>
                      <span className={`tabular-nums font-medium ${isDimmed ? 'text-gray-400' : 'text-gray-800'}`}>
                        {fmtAmt(entry.value)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Transaction list */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider truncate">
              {activePieCategory ?? 'Transactions'}
            </h2>
            <span className="text-xs text-gray-600 shrink-0 ml-2">
              {filteredTransactions.length} item{filteredTransactions.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filteredTransactions.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-sm text-gray-600">
              No transactions
            </div>
          ) : (
            <ul className="divide-y divide-gray-50 max-h-72 overflow-y-auto">
              {filteredTransactions.slice(0, 60).map(tx => {
                let dateDisplay = tx.date
                try { dateDisplay = format(parseISO(tx.date), 'MMM d') } catch {}
                return (
                  <li key={tx.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-10 shrink-0 text-xs text-gray-700">{dateDisplay}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{tx.category}</p>
                      {(tx.description || tx.subcategory) && (
                        <p className="text-xs text-gray-600 truncate">
                          {tx.description || tx.subcategory}
                        </p>
                      )}
                    </div>
                    <span
                      className={`text-xs font-semibold tabular-nums shrink-0 ${
                        tx.type === 'income' ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '−'}{fmtAmt(Number(tx.amount))}
                    </span>
                  </li>
                )
              })}
              {filteredTransactions.length > 60 && (
                <li className="py-2 text-center text-xs text-gray-600">
                  +{filteredTransactions.length - 60} more
                </li>
              )}
            </ul>
          )}
        </div>

      </div>
    </div>
  )
}
