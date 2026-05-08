import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic()

interface AIPrediction {
  predictedMonthTotal: number
  goalAtRisk: boolean
  confidenceLevel: 'high' | 'medium' | 'low'
  suggestion: string
  estimatedSavings: number
}

export async function GET() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return Response.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  // 1. Return cached prediction if one already exists for today
  const { data: cached } = await supabase
    .from('predictions')
    .select('*')
    .eq('user_id', user.id)
    .eq('prediction_date', today)
    .single()

  if (cached) {
    return Response.json({ data: cached, error: null })
  }

  // 2. Fetch last 30 days of transactions
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0]

  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('user_id', user.id)
    .gte('date', thirtyDaysAgoStr)
    .order('date', { ascending: false })

  if (txError) {
    return Response.json({ data: null, error: txError.message }, { status: 500 })
  }

  // 3. Fetch active goals
  const { data: goals, error: goalsError } = await supabase
    .from('goals')
    .select('title, target_amount, current_amount, deadline')
    .eq('user_id', user.id)
    .eq('is_achieved', false)

  if (goalsError) {
    return Response.json({ data: null, error: goalsError.message }, { status: 500 })
  }

  // 4. Calculate stats
  const now = new Date()
  const currentDay = now.getDate()
  const currentMonthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`

  const expenses = (transactions ?? []).filter(t => t.type === 'expense')

  const spentThisMonth = expenses
    .filter(t => t.date >= currentMonthStart)
    .reduce((sum, t) => sum + Number(t.amount), 0)

  const totalLast30Days = expenses.reduce((sum, t) => sum + Number(t.amount), 0)
  const dailyAverage = totalLast30Days / 30

  const categoryTotals: Record<string, number> = {}
  for (const t of expenses) {
    categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + Number(t.amount)
  }
  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, total]) => `${cat}: $${total.toFixed(2)}`)
    .join(', ') || 'none'

  const goalsSummary = (goals ?? []).length > 0
    ? goals!.map(g =>
        `${g.title} (target: $${g.target_amount}, saved: $${g.current_amount}, deadline: ${g.deadline})`
      ).join('; ')
    : 'No active goals'

  // 5. Call Claude API
  let aiPrediction: AIPrediction
  try {
    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 400,
      system: 'You are a personal finance analyst. Analyze spending patterns and predict end-of-month total. Always respond with valid JSON only, no other text.',
      messages: [
        {
          role: 'user',
          content:
            `Today is day ${currentDay} of the month. Spent so far this month: $${spentThisMonth.toFixed(2)}. Daily average: $${dailyAverage.toFixed(2)}. Top categories: ${topCategories}. Active goals: ${goalsSummary}. Predict end-of-month total and give one specific action to reduce spending. Respond ONLY with this JSON: {"predictedMonthTotal": number, "goalAtRisk": boolean, "confidenceLevel": "high"|"medium"|"low", "suggestion": string, "estimatedSavings": number}`,
        },
      ],
    })

    const textBlock = message.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return Response.json({ data: null, error: 'No text response from AI' }, { status: 500 })
    }

    aiPrediction = JSON.parse(textBlock.text) as AIPrediction
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI prediction failed'
    return Response.json({ data: null, error: msg }, { status: 500 })
  }

  // 6. Save to predictions table (upsert handles the rare race condition of two requests on the same day)
  const { data: saved, error: saveError } = await supabase
    .from('predictions')
    .upsert(
      {
        user_id: user.id,
        prediction_date: today,
        predicted_month_total: aiPrediction.predictedMonthTotal,
        goal_at_risk: aiPrediction.goalAtRisk,
        confidence_level: aiPrediction.confidenceLevel,
        suggestion: aiPrediction.suggestion,
      },
      { onConflict: 'user_id,prediction_date' }
    )
    .select()
    .single()

  if (saveError) {
    return Response.json({ data: null, error: saveError.message }, { status: 500 })
  }

  // estimatedSavings comes from the AI but isn't persisted — include it in the response
  return Response.json({
    data: { ...saved, estimatedSavings: aiPrediction.estimatedSavings },
    error: null,
  })
}
