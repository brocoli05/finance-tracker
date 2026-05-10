import { calculateDailyAverage } from '@/lib/utils/calculations'

describe('calculateDailyAverage', () => {
  it('returns 0 when there are no transactions', () => {
    expect(calculateDailyAverage([], 15)).toBe(0)
  })

  it('returns 0 when daysElapsed is 0', () => {
    expect(calculateDailyAverage([{ amount: 100, date: '2024-01-01' }], 0)).toBe(0)
  })

  it('returns 0 when daysElapsed is negative', () => {
    expect(calculateDailyAverage([{ amount: 50, date: '2024-01-01' }], -1)).toBe(0)
  })

  it('calculates the correct average for a single transaction', () => {
    const expenses = [{ amount: 30, date: '2024-01-10' }]
    // $30 over 10 days = $3/day
    expect(calculateDailyAverage(expenses, 10)).toBe(3)
  })

  it('calculates the correct average across multiple transactions', () => {
    const expenses = [
      { amount: 50, date: '2024-01-05' },
      { amount: 100, date: '2024-01-10' },
    ]
    // $150 over 15 days = $10/day
    expect(calculateDailyAverage(expenses, 15)).toBe(10)
  })

  it('calculates the correct average for a full 31-day month', () => {
    const expenses = [
      { amount: 310, date: '2024-01-15' },
      { amount: 620, date: '2024-01-20' },
    ]
    // $930 over 31 days = $30/day
    expect(calculateDailyAverage(expenses, 31)).toBe(30)
  })

  it('handles string amounts correctly', () => {
    const expenses = [{ amount: '60', date: '2024-01-06' }]
    expect(calculateDailyAverage(expenses, 6)).toBe(10)
  })
})
