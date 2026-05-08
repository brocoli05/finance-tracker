'use client'

import { useEffect, useState } from 'react'

interface Prediction {
  id: string
  prediction_date: string
  predicted_month_total: number
  goal_at_risk: boolean
  confidence_level: 'high' | 'medium' | 'low'
  suggestion: string
  estimatedSavings: number
  created_at: string
}

interface Transaction {
  amount: number
  type: 'income' | 'expense'
  date: string
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="h-5 w-36 rounded bg-gray-200" />
        <div className="h-6 w-16 rounded-full bg-gray-200" />
      </div>
      <div className="h-12 w-48 rounded bg-gray-200" />
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
        </div>
        <div className="h-3 w-full rounded-full bg-gray-200" />
      </div>
      <div className="h-20 w-full rounded-xl bg-gray-200" />
      <div className="h-4 w-32 rounded bg-gray-200" />
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONFIDENCE_STYLES: Record<Prediction['confidence_level'], string> = {
  high:   'bg-emerald-100 text-emerald-700',
  medium: 'bg-amber-100   text-amber-700',
  low:    'bg-gray-100    text-gray-600',
}

function progressColor(pct: number) {
  if (pct >= 100) return 'bg-rose-500'
  if (pct >= 80)  return 'bg-amber-400'
  return 'bg-emerald-500'
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function currentMonthStart() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PredictionCard() {
  const [prediction, setPrediction] = useState<Prediction | null>(null)
  const [spentThisMonth, setSpentThisMonth] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [predRes, txRes] = await Promise.all([
          fetch('/api/predict'),
          fetch('/api/transactions'),
        ])

        const predJson = await predRes.json()
        const txJson   = await txRes.json()

        if (!predRes.ok || predJson.error) {
          setError(typeof predJson.error === 'string' ? predJson.error : 'Failed to load prediction')
          return
        }

        setPrediction(predJson.data)

        if (txJson.data) {
          const monthStart = currentMonthStart()
          const spent = (txJson.data as Transaction[])
            .filter(t => t.type === 'expense' && t.date >= monthStart)
            .reduce((sum, t) => sum + Number(t.amount), 0)
          setSpentThisMonth(spent)
        }
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  if (loading) return <Skeleton />

  if (error || !prediction) {
    return (
      <div className="rounded-2xl border border-rose-100 bg-rose-50 p-6 text-sm text-rose-600">
        {error ?? 'No prediction available.'}
      </div>
    )
  }

  const predicted  = prediction.predicted_month_total
  const progressPct = predicted > 0 ? Math.min((spentThisMonth / predicted) * 100, 110) : 0
  const barWidth    = Math.min(progressPct, 100)

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
          Spending Prediction
        </h2>
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${CONFIDENCE_STYLES[prediction.confidence_level]}`}>
          {prediction.confidence_level} confidence
        </span>
      </div>

      {/* Predicted total */}
      <div>
        <p className="text-xs text-gray-700 mb-0.5">Predicted end-of-month total</p>
        <p className="text-4xl font-bold tracking-tight text-gray-900">
          {fmt(predicted)}
        </p>
      </div>

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-700">
          <span>Spent so far</span>
          <span>
            <span className="font-medium text-gray-700">{fmt(spentThisMonth)}</span>
            {' '}of{' '}
            <span className="font-medium text-gray-700">{fmt(predicted)}</span>
            {' '}
            <span className="text-gray-600">({Math.round(progressPct)}%)</span>
          </span>
        </div>
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all duration-500 ${progressColor(progressPct)}`}
            style={{ width: `${barWidth}%` }}
          />
        </div>
        {progressPct >= 100 && (
          <p className="text-xs text-rose-500 font-medium">Over budget</p>
        )}
      </div>

      {/* Goal at risk */}
      {prediction.goal_at_risk && (
        <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2">
          <span className="text-rose-500 text-base">⚠️</span>
          <p className="text-sm font-bold text-rose-700">Goal at risk — you may miss a savings target this month</p>
        </div>
      )}

      {/* Suggestion */}
      <div className="rounded-xl bg-indigo-50 border border-indigo-100 px-4 py-3 space-y-2">
        <div className="flex items-start gap-2">
          <span className="text-lg leading-none mt-0.5">💡</span>
          <p className="text-sm text-indigo-900 leading-relaxed">{prediction.suggestion}</p>
        </div>
        {prediction.estimatedSavings > 0 && (
          <p className="text-xs text-indigo-600 font-medium pl-7">
            Estimated savings:{' '}
            <span className="text-indigo-800 font-bold">{fmt(prediction.estimatedSavings)}</span>
          </p>
        )}
      </div>

      {/* Footer */}
      <p className="text-xs text-gray-600">Last updated today</p>

    </div>
  )
}
