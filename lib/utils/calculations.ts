import { differenceInDays, parseISO } from 'date-fns'

export interface TransactionSummary {
  amount: number | string
  date: string
}

export interface GroupableTransaction extends TransactionSummary {
  id: string
  type: 'income' | 'expense'
  category: string
}

export interface YearMonthGroup {
  key: string
  transactions: GroupableTransaction[]
}

/**
 * Returns daily average spend given a list of expense transactions
 * and the number of days elapsed in the period.
 */
export function calculateDailyAverage(
  expenses: TransactionSummary[],
  daysElapsed: number,
): number {
  if (daysElapsed <= 0 || expenses.length === 0) return 0
  const total = expenses.reduce((sum, t) => sum + Number(t.amount), 0)
  return total / daysElapsed
}

/**
 * Groups transactions by "YYYY-MM" key. Groups are sorted most-recent-first;
 * transactions within each group are sorted by date descending.
 */
export function groupTransactionsByYearMonth(
  transactions: GroupableTransaction[],
): YearMonthGroup[] {
  const map = new Map<string, GroupableTransaction[]>()

  for (const tx of transactions) {
    const key = tx.date.slice(0, 7)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(tx)
  }

  return Array.from(map.entries())
    .map(([key, txs]) => ({
      key,
      transactions: [...txs].sort((a, b) => b.date.localeCompare(a.date)),
    }))
    .sort((a, b) => b.key.localeCompare(a.key))
}

/**
 * Returns goal progress as an integer percentage capped at 100.
 */
export function calculateGoalProgress(current: number, target: number): number {
  if (target <= 0) return 0
  return Math.min(100, Math.round((current / target) * 100))
}

/**
 * Returns days remaining until deadline (negative if overdue).
 * Accepts an optional `today` argument so tests can pass a fixed date.
 */
export function calculateDaysRemaining(deadline: string, today: Date = new Date()): number {
  return differenceInDays(parseISO(deadline), today)
}
