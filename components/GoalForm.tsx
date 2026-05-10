'use client'

import { useState } from 'react'

const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Phone', 'Food', 'Clothes',
  'Electronics', 'Gifts', 'Travel', 'Hobbies', 'Other',
] as const

interface FormState {
  title: string
  target_amount: string
  deadline: string
  category: string
}

interface InitialData {
  id: string
  title: string
  target_amount: number | string
  deadline: string
  category: string
}

interface Props {
  onSuccess: () => void
  initialData?: InitialData
}

const today = () => new Date().toISOString().split('T')[0]

function makeForm(initial?: InitialData): FormState {
  if (!initial) {
    return { title: '', target_amount: '', deadline: '', category: '' }
  }
  return {
    title:         initial.title,
    target_amount: String(initial.target_amount),
    deadline:      initial.deadline,
    category:      initial.category,
  }
}

export default function GoalForm({ onSuccess, initialData }: Props) {
  const isEdit = !!initialData?.id
  const [form, setForm]       = useState<FormState>(() => makeForm(initialData))
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const target_amount = parseFloat(form.target_amount)
    if (isNaN(target_amount) || target_amount <= 0) {
      setError('Target amount must be a positive number.')
      return
    }
    if (!form.title.trim()) {
      setError('Please enter a goal title.')
      return
    }
    if (!form.deadline) {
      setError('Please select a deadline.')
      return
    }
    if (!form.category) {
      setError('Please select a category.')
      return
    }

    setLoading(true)
    try {
      const url    = isEdit ? `/api/goals/${initialData!.id}` : '/api/goals'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          target_amount,
          deadline: form.deadline,
          category: form.category,
        }),
      })

      const json = await res.json()
      if (!res.ok || json.error) {
        setError(typeof json.error === 'string' ? json.error : 'Submission failed. Please check your inputs.')
        return
      }

      if (!isEdit) setForm(makeForm())
      onSuccess()
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Goal Title <span className="text-rose-500">*</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Emergency Fund"
          value={form.title}
          onChange={e => setField('title', e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Target Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Target Amount <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
          <input
            type="number"
            min="0.01"
            step="0.01"
            placeholder="0.00"
            value={form.target_amount}
            onChange={e => setField('target_amount', e.target.value)}
            required
            className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Deadline */}
      <div>
        <label htmlFor="goal-deadline" className="block text-sm font-medium text-gray-700 mb-1">
          Deadline <span className="text-rose-500">*</span>
        </label>
        <input
          id="goal-deadline"
          type="date"
          value={form.deadline}
          min={today()}
          onChange={e => setField('deadline', e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Category */}
      <div>
        <label htmlFor="goal-category" className="block text-sm font-medium text-gray-700 mb-1">
          Category to Cut <span className="text-rose-500">*</span>
        </label>
        <select
          id="goal-category"
          value={form.category}
          onChange={e => setField('category', e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="">Select a category</option>
          {EXPENSE_CATEGORIES.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        {loading && (
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        )}
        {loading
          ? isEdit ? 'Saving…' : 'Adding…'
          : isEdit ? 'Save Changes' : 'Add Goal'}
      </button>

    </form>
  )
}
