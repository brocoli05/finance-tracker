'use client'

import { differenceInDays, parseISO } from 'date-fns'

export interface Goal {
  id: string
  title: string
  target_amount: number | string
  current_amount: number | string
  deadline: string
  category: string
  is_achieved: boolean
}

interface Props {
  goal: Goal
  onEdit: (goal: Goal) => void
  onDelete: (goal: Goal) => void
  onAddSavings: (goal: Goal) => void
}

const CATEGORY_COLORS: Record<string, string> = {
  Rent:        'bg-blue-100 text-blue-700',
  Utilities:   'bg-cyan-100 text-cyan-700',
  Phone:       'bg-teal-100 text-teal-700',
  Food:        'bg-orange-100 text-orange-700',
  Clothes:     'bg-pink-100 text-pink-700',
  Electronics: 'bg-purple-100 text-purple-700',
  Gifts:       'bg-red-100 text-red-700',
  Travel:      'bg-sky-100 text-sky-700',
  Hobbies:     'bg-lime-100 text-lime-700',
  Other:       'bg-gray-100 text-gray-700',
}

function fmtAmount(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export default function GoalCard({ goal, onEdit, onDelete, onAddSavings }: Props) {
  const target  = Number(goal.target_amount)
  const current = Number(goal.current_amount)
  const pct     = Math.min(100, target > 0 ? Math.round((current / target) * 100) : 0)

  const daysLeft = differenceInDays(parseISO(goal.deadline), new Date())
  const overdue  = daysLeft < 0

  const badgeClass = CATEGORY_COLORS[goal.category] ?? 'bg-gray-100 text-gray-700'
  const barColor   = goal.is_achieved ? 'bg-emerald-500' : pct >= 80 ? 'bg-indigo-500' : 'bg-indigo-400'

  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm space-y-4 ${
      goal.is_achieved ? 'border-emerald-200' : 'border-gray-100'
    }`}>

      {/* Congrats banner */}
      {goal.is_achieved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 font-medium">
          Goal achieved! You saved {fmtAmount(current)} for {goal.title}.
        </div>
      )}

      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{goal.title}</h3>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass}`}>
              {goal.category}
            </span>
            {!goal.is_achieved && (
              <span className={`text-xs ${overdue ? 'text-rose-600 font-medium' : 'text-gray-700'}`}>
                {overdue
                  ? `${Math.abs(daysLeft)}d overdue`
                  : daysLeft === 0
                  ? 'Due today'
                  : `${daysLeft}d left`}
              </span>
            )}
          </div>
        </div>

        {/* Edit / Delete */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => onEdit(goal)}
            title="Edit"
            className="p-1.5 rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          <button
            onClick={() => onDelete(goal)}
            title="Delete"
            className="p-1.5 rounded-md text-gray-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Amounts */}
      <div className="flex items-end justify-between tabular-nums">
        <span className="text-sm text-gray-700">
          <span className="text-base font-bold text-gray-900">{fmtAmount(current)}</span>
          {' '}/ {fmtAmount(target)}
        </span>
        <span className={`text-xs font-semibold ${goal.is_achieved ? 'text-emerald-600' : 'text-indigo-600'}`}>
          {pct}%
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Add Savings */}
      {!goal.is_achieved && (
        <button
          onClick={() => onAddSavings(goal)}
          className="w-full py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
        >
          + Add Savings
        </button>
      )}

    </div>
  )
}
