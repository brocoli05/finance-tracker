'use client'

import { useState } from 'react'

const CATEGORIES = {
  income: ['Payroll', 'Stock Investment', 'Part-time tip', 'Other'],
  expense: ['Rent', 'Utilities', 'Phone', 'Food', 'Clothes', 'Electronics', 'Gifts', 'Travel', 'Hobbies', 'Other'],
} as const

const MOODS = [
  { value: 'happy',       emoji: '😊', label: 'Happy' },
  { value: 'stressed',    emoji: '😰', label: 'Stressed' },
  { value: 'bored',       emoji: '😑', label: 'Bored' },
  { value: 'celebratory', emoji: '🎉', label: 'Celebratory' },
] as const

type Mood = typeof MOODS[number]['value']
type TransactionType = 'income' | 'expense'

interface FormState {
  amount: string
  type: TransactionType
  category: string
  subcategory: string
  description: string
  date: string
  mood: Mood | ''
}

interface InitialData {
  id: string
  amount: number | string
  type: TransactionType
  category: string
  subcategory?: string
  description?: string
  date: string
  mood?: Mood | ''
}

interface Props {
  onSuccess: () => void
  initialData?: InitialData
}

const today = () => new Date().toISOString().split('T')[0]

function makeForm(initial?: InitialData): FormState {
  if (!initial) {
    return { amount: '', type: 'expense', category: '', subcategory: '', description: '', date: today(), mood: '' }
  }
  return {
    amount:      String(initial.amount),
    type:        initial.type,
    category:    initial.category,
    subcategory: initial.subcategory ?? '',
    description: initial.description ?? '',
    date:        initial.date,
    mood:        initial.mood ?? '',
  }
}

export default function TransactionForm({ onSuccess, initialData }: Props) {
  const isEdit = !!initialData?.id
  const [form, setForm]       = useState<FormState>(() => makeForm(initialData))
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleTypeToggle(type: TransactionType) {
    setForm(prev => ({ ...prev, type, category: '' }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const amount = parseFloat(form.amount)
    if (isNaN(amount) || amount <= 0) {
      setError('Amount must be a positive number.')
      return
    }
    if (!form.category) {
      setError('Please select a category.')
      return
    }

    setLoading(true)
    try {
      const url    = isEdit ? `/api/transactions/${initialData!.id}` : '/api/transactions'
      const method = isEdit ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          type: form.type,
          category: form.category,
          date: form.date,
          ...(form.subcategory  && { subcategory: form.subcategory }),
          ...(form.description  && { description: form.description }),
          ...(form.mood         && { mood: form.mood }),
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

  const categories = CATEGORIES[form.type]

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">

      {/* Type toggle */}
      <div className="flex rounded-lg overflow-hidden border border-gray-200 w-fit">
        {(['expense', 'income'] as TransactionType[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => handleTypeToggle(t)}
            className={`px-6 py-2 text-sm font-medium capitalize transition-colors ${
              form.type === t
                ? t === 'income' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Amount */}
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
            value={form.amount}
            onChange={e => setField('amount', e.target.value)}
            required
            className="w-full pl-7 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Category */}
      <div>
        <label htmlFor="tx-category" className="block text-sm font-medium text-gray-700 mb-1">
          Category <span className="text-rose-500">*</span>
        </label>
        <select
          id="tx-category"
          value={form.category}
          onChange={e => setField('category', e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-300"
        >
          <option value="" className="text-gray-500">Select a category</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Subcategory */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Subcategory <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="e.g. Groceries"
          value={form.subcategory}
          onChange={e => setField('subcategory', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <input
          type="text"
          placeholder="Add a note..."
          value={form.description}
          onChange={e => setField('description', e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Date */}
      <div>
        <label htmlFor="tx-date" className="block text-sm font-medium text-gray-700 mb-1">
          Date <span className="text-rose-500">*</span>
        </label>
        <input
          id="tx-date"
          type="date"
          value={form.date}
          onChange={e => setField('date', e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
      </div>

      {/* Mood */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Mood <span className="text-gray-500 font-normal">(optional)</span>
        </label>
        <div className="flex gap-2 flex-wrap">
          {MOODS.map(({ value, emoji, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setField('mood', form.mood === value ? '' : value)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition-colors ${
                form.mood === value
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-medium'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>
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
          : isEdit ? 'Save Changes' : 'Add Transaction'}
      </button>

    </form>
  )
}
