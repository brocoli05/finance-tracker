import { createClient } from '@/lib/supabase/server'
import { generatePrediction } from '@/lib/ai/predictionEngine'

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

  // 4. Generate prediction locally
  const prediction = generatePrediction(transactions ?? [], goals ?? [])

  // 5. Save to predictions table (upsert handles the rare race condition of two requests on the same day)
  const { data: saved, error: saveError } = await supabase
    .from('predictions')
    .upsert(
      {
        user_id: user.id,
        prediction_date: today,
        predicted_month_total: prediction.predictedMonthTotal,
        goal_at_risk: prediction.goalAtRisk,
        confidence_level: prediction.confidenceLevel,
        suggestion: prediction.suggestion,
      },
      { onConflict: 'user_id,prediction_date' }
    )
    .select()
    .single()

  if (saveError) {
    return Response.json({ data: null, error: saveError.message }, { status: 500 })
  }

  // estimatedSavings isn't a DB column — include it directly in the response
  return Response.json({
    data: { ...saved, estimatedSavings: prediction.estimatedSavings },
    error: null,
  })
}
