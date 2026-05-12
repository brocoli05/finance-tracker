import { generatePrediction, PredictionTransaction, PredictionGoal } from '@/lib/ai/predictionEngine'

const expense = (amount: number, category: string, date: string): PredictionTransaction => ({
  amount,
  type: 'expense',
  category,
  date,
})

// May 2024 — 31-day month used consistently across all tests
const MAY_15 = new Date(2024, 4, 15) // day 15 → medium confidence
const MAY_5  = new Date(2024, 4, 5)  // day 5  → low confidence
const MAY_10 = new Date(2024, 4, 10) // day 10 → medium confidence
const MAY_20 = new Date(2024, 4, 20) // day 20 → high confidence

describe('generatePrediction', () => {
  it('returns safe defaults for empty transactions', () => {
    const result = generatePrediction([], [], MAY_15)
    expect(result.predictedMonthTotal).toBe(0)
    expect(result.goalAtRisk).toBe(false)
    expect(result.estimatedSavings).toBe(0)
  })

  it('calculates daily average and projects end-of-month correctly', () => {
    // $300 spent over 10 days → $30/day → $30 * 31 = $930
    const transactions = [
      expense(100, 'Food', '2024-05-01'),
      expense(200, 'Food', '2024-05-05'),
    ]
    const result = generatePrediction(transactions, [], MAY_10)
    expect(result.predictedMonthTotal).toBe(930)
  })

  it('sets goalAtRisk true when projected total exceeds a goal target', () => {
    // $500 on day 1 → projects to $500 * 31 = $15,500 > goal of $100
    const transactions = [expense(500, 'Food', '2024-05-01')]
    const goals: PredictionGoal[] = [{ target_amount: 100 }]
    const result = generatePrediction(transactions, goals, MAY_5)
    expect(result.goalAtRisk).toBe(true)
  })

  it('sets goalAtRisk false when projected total is within all goals', () => {
    const transactions = [expense(10, 'Food', '2024-05-01')]
    const goals: PredictionGoal[] = [{ target_amount: 10000 }]
    const result = generatePrediction(transactions, goals, MAY_5)
    expect(result.goalAtRisk).toBe(false)
  })

  it('returns low confidence before day 10', () => {
    expect(generatePrediction([], [], MAY_5).confidenceLevel).toBe('low')
  })

  it('returns medium confidence from day 10', () => {
    expect(generatePrediction([], [], MAY_10).confidenceLevel).toBe('medium')
  })

  it('returns high confidence from day 20', () => {
    expect(generatePrediction([], [], MAY_20).confidenceLevel).toBe('high')
  })

  it('suggestion mentions the top spending category', () => {
    const transactions = [
      expense(200, 'Dining',    '2024-05-01'),
      expense(50,  'Transport', '2024-05-01'),
    ]
    const result = generatePrediction(transactions, [], MAY_15)
    expect(result.topCategory).toBe('Dining')
    expect(result.suggestion).toContain('Dining')
  })

  it('excludes income transactions from the projection', () => {
    const transactions: PredictionTransaction[] = [
      expense(300, 'Food', '2024-05-01'),
      { amount: 5000, type: 'income', category: 'Salary', date: '2024-05-01' },
    ]
    const result = generatePrediction(transactions, [], MAY_10)
    // Only the $300 expense counts: $30/day * 31 = $930
    expect(result.predictedMonthTotal).toBe(930)
  })
})
