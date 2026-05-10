import { groupTransactionsByYearMonth, GroupableTransaction } from '@/lib/utils/calculations'

function tx(id: string, date: string, amount = 10): GroupableTransaction {
  return { id, amount, type: 'expense', category: 'Food', date }
}

describe('groupTransactionsByYearMonth', () => {
  it('returns an empty array for no transactions', () => {
    expect(groupTransactionsByYearMonth([])).toEqual([])
  })

  it('groups transactions by year-month key', () => {
    const transactions = [
      tx('1', '2024-01-10'),
      tx('2', '2024-01-20'),
      tx('3', '2024-02-05'),
    ]
    const result = groupTransactionsByYearMonth(transactions)
    expect(result).toHaveLength(2)
    expect(result.map(g => g.key)).toEqual(['2024-02', '2024-01'])
  })

  it('puts all same-month transactions into one group', () => {
    const transactions = [
      tx('1', '2024-03-01'),
      tx('2', '2024-03-15'),
      tx('3', '2024-03-31'),
    ]
    const [group] = groupTransactionsByYearMonth(transactions)
    expect(group.key).toBe('2024-03')
    expect(group.transactions).toHaveLength(3)
  })

  it('sorts groups most-recent first', () => {
    const transactions = [
      tx('1', '2023-12-01'),
      tx('2', '2024-02-01'),
      tx('3', '2024-01-01'),
    ]
    const keys = groupTransactionsByYearMonth(transactions).map(g => g.key)
    expect(keys).toEqual(['2024-02', '2024-01', '2023-12'])
  })

  it('sorts transactions within a group by date descending', () => {
    const transactions = [
      tx('1', '2024-01-05'),
      tx('2', '2024-01-20'),
      tx('3', '2024-01-10'),
    ]
    const [group] = groupTransactionsByYearMonth(transactions)
    expect(group.transactions.map(t => t.date)).toEqual([
      '2024-01-20',
      '2024-01-10',
      '2024-01-05',
    ])
  })

  it('handles transactions spanning multiple years', () => {
    const transactions = [
      tx('1', '2022-06-01'),
      tx('2', '2023-06-01'),
      tx('3', '2024-06-01'),
    ]
    const result = groupTransactionsByYearMonth(transactions)
    expect(result).toHaveLength(3)
    expect(result[0].key).toBe('2024-06')
    expect(result[2].key).toBe('2022-06')
  })
})
