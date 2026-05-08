'use client'

import { useEffect, useState } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Transaction {
  amount: number
  type: 'income' | 'expense'
  date: string
}

interface Prediction {
  predicted_month_total: number
}

interface DataPoint {
  date: string      // "MM/DD" — X axis label and ReferenceLine key
  fullDate: string  // "YYYY-MM-DD"
  actual: number | null
  predicted: number | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toMMDD(dateStr: string): string {
  const [, m, d] = dateStr.split('-')
  return `${m}/${d}`
}

function yFmt(v: number): string {
  if (v >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v}`
}

function buildChartData(
  transactions: Transaction[],
  prediction: Prediction | null,
): { data: DataPoint[]; todayLabel: string } {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const todayLabel = toMMDD(todayStr)

  const year = now.getFullYear()
  const month = now.getMonth()
  const currentDay = now.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}-`

  // Aggregate expense amounts by calendar date
  const spendingByDate: Record<string, number> = {}
  for (const t of transactions) {
    if (t.type === 'expense') {
      spendingByDate[t.date] = (spendingByDate[t.date] ?? 0) + Number(t.amount)
    }
  }

  // Project future daily spend from the AI prediction
  let projectedDaily: number | null = null
  if (prediction) {
    const spentThisMonth = Object.entries(spendingByDate)
      .filter(([d]) => d.startsWith(monthPrefix))
      .reduce((s, [, v]) => s + v, 0)
    const daysLeft = daysInMonth - currentDay
    const remaining = prediction.predicted_month_total - spentThisMonth
    projectedDaily = daysLeft > 0 ? Math.max(0, remaining / daysLeft) : 0
  }

  const data: DataPoint[] = []

  // Last 30 days (oldest → today)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    data.push({
      date: toMMDD(dateStr),
      fullDate: dateStr,
      actual: spendingByDate[dateStr] ?? 0,
      // Anchor the predicted line to today so it connects visually
      predicted: i === 0 && projectedDaily !== null ? projectedDaily : null,
    })
  }

  // Future days: tomorrow → end of month
  for (let day = currentDay + 1; day <= daysInMonth; day++) {
    const dateStr = `${monthPrefix}${String(day).padStart(2, '0')}`
    data.push({
      date: toMMDD(dateStr),
      fullDate: dateStr,
      actual: null,
      predicted: projectedDaily,
    })
  }

  return { data, todayLabel }
}

// ─── Custom tooltip ───────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ dataKey: string; value: number | null; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  const actual    = payload.find(p => p.dataKey === 'actual')
  const predicted = payload.find(p => p.dataKey === 'predicted')

  const hasActual    = actual?.value != null && actual.value > 0
  const hasPredicted = predicted?.value != null

  if (!hasActual && !hasPredicted) return null

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-lg text-sm space-y-0.5">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {hasActual && (
        <p style={{ color: actual!.color }}>
          Spent: <span className="font-medium">${actual!.value!.toFixed(2)}</span>
        </p>
      )}
      {hasPredicted && (
        <p style={{ color: predicted!.color }}>
          Projected: <span className="font-medium">${predicted!.value!.toFixed(2)}/day</span>
        </p>
      )}
    </div>
  )
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <div className="h-5 w-36 rounded bg-gray-200" />
        <div className="h-4 w-24 rounded bg-gray-200" />
      </div>
      <div className="h-64 w-full rounded-xl bg-gray-100" />
      <div className="flex gap-6 mt-4 justify-center">
        <div className="h-4 w-28 rounded bg-gray-200" />
        <div className="h-4 w-36 rounded bg-gray-200" />
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SpendingChart() {
  const [data, setData]           = useState<DataPoint[]>([])
  const [todayLabel, setToday]    = useState('')
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [txRes, predRes] = await Promise.all([
          fetch('/api/transactions'),
          fetch('/api/predict'),
        ])

        const txJson   = await txRes.json()
        const predJson = await predRes.json()

        if (!txRes.ok || txJson.error) {
          setError(typeof txJson.error === 'string' ? txJson.error : 'Failed to load transactions')
          return
        }

        const prediction: Prediction | null = predRes.ok && !predJson.error
          ? predJson.data
          : null

        const { data: chartData, todayLabel: tl } = buildChartData(
          txJson.data ?? [],
          prediction,
        )
        setData(chartData)
        setToday(tl)
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) return <Skeleton />

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-600">
        {error}
      </div>
    )
  }

  // Show a tick every ~7 data points so the X axis stays readable
  const tickInterval = Math.max(1, Math.floor(data.length / 7))

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Spending Overview
        </h2>
        <span className="text-xs text-gray-600">Last 30 days + projection</span>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={data} margin={{ top: 4, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />

          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#374151' }}
            tickLine={false}
            axisLine={false}
            interval={tickInterval}
          />

          <YAxis
            tickFormatter={yFmt}
            tick={{ fontSize: 11, fill: '#374151' }}
            tickLine={false}
            axisLine={false}
            width={48}
          />

          <Tooltip content={<CustomTooltip />} />

          <Legend
            iconType="square"
            iconSize={10}
            wrapperStyle={{ fontSize: 12, paddingTop: 16 }}
            formatter={(value) =>
              value === 'actual' ? 'Daily spending' : 'Projected daily spend'
            }
          />

          {/* Vertical reference line at today */}
          {todayLabel && (
            <ReferenceLine
              x={todayLabel}
              stroke="#94a3b8"
              strokeDasharray="4 3"
              label={{
                value: 'Today',
                position: 'insideTopRight',
                fontSize: 10,
                fill: '#94a3b8',
                dy: -4,
              }}
            />
          )}

          {/* Actual daily spending — blue bars */}
          <Bar
            dataKey="actual"
            fill="#3b82f6"
            radius={[3, 3, 0, 0]}
            maxBarSize={24}
            isAnimationActive={false}
          />

          {/* AI-predicted trajectory — orange dashed line */}
          <Line
            dataKey="predicted"
            stroke="#f97316"
            strokeWidth={2}
            strokeDasharray="6 4"
            dot={false}
            activeDot={{ r: 4, fill: '#f97316' }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
