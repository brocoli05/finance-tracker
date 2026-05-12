export interface PredictionTransaction {
  amount: number | string
  type: string
  category: string
  date: string // YYYY-MM-DD
}

export interface PredictionGoal {
  target_amount: number | string
}

export interface PredictionResult {
  predictedMonthTotal: number
  goalAtRisk: boolean
  confidenceLevel: 'high' | 'medium' | 'low'
  suggestion: string
  estimatedSavings: number
  topCategory: string
}

export function generatePrediction(
  transactions: PredictionTransaction[],
  goals: PredictionGoal[],
  now: Date = new Date()
): PredictionResult {
  const year = now.getFullYear()
  const month = now.getMonth()
  const currentDay = now.getDate()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`

  const thisMonthExpenses = transactions.filter(
    t => t.type === 'expense' && t.date >= monthStart
  )

  const spentThisMonth = thisMonthExpenses.reduce((sum, t) => sum + Number(t.amount), 0)
  const dailyAverage = currentDay > 0 ? spentThisMonth / currentDay : 0
  const predictedMonthTotal = Math.round(dailyAverage * daysInMonth)

  const goalAtRisk = goals.some(g => predictedMonthTotal > Number(g.target_amount))

  const confidenceLevel: 'high' | 'medium' | 'low' =
    currentDay >= 20 ? 'high' :
    currentDay >= 10 ? 'medium' :
    'low'

  const categoryTotals: Record<string, number> = {}
  for (const t of thisMonthExpenses) {
    categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + Number(t.amount)
  }
  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])

  const topCategory = sortedCategories.length > 0 ? sortedCategories[0][0] : 'General'
  const topCategoryAmount = sortedCategories.length > 0 ? sortedCategories[0][1] : 0
  const estimatedSavings = predictedMonthTotal * 0.15

  const suggestion = sortedCategories.length > 0
    ? `Your highest spending is ${topCategory} at $${topCategoryAmount.toFixed(2)}. Consider reducing it by 20% to save $${estimatedSavings.toFixed(2)} this month.`
    : 'No spending recorded this month yet. Start tracking your transactions to get personalized suggestions.'

  return {
    predictedMonthTotal,
    goalAtRisk,
    confidenceLevel,
    suggestion,
    estimatedSavings,
    topCategory,
  }
}
