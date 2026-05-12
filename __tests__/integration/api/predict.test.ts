/**
 * @jest-environment node
 */

jest.mock('@/lib/supabase/server')

import { GET } from '@/app/api/predict/route'
import { createClient } from '@/lib/supabase/server'
import { createMockSupabaseClient } from '../../mocks/supabase.mock'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const TEST_USER = { id: 'user-123', email: 'test@example.com' }
const TODAY = new Date().toISOString().split('T')[0]
const MONTH_START = `${TODAY.substring(0, 7)}-01`

const CACHED_PREDICTION = {
  id: 'pred-cached',
  user_id: TEST_USER.id,
  prediction_date: TODAY,
  predicted_month_total: 1500,
  goal_at_risk: false,
  confidence_level: 'high',
  suggestion: 'Reduce dining out',
}

describe('GET /api/predict', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns cached result and skips prediction engine when prediction exists for today', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [{ data: CACHED_PREDICTION, error: null }],
      }) as any
    )

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toMatchObject({ predicted_month_total: 1500 })
  })

  it('generates local prediction and saves result when no cache exists', async () => {
    const savedPrediction = {
      id: 'pred-new',
      user_id: TEST_USER.id,
      prediction_date: TODAY,
      predicted_month_total: 0,
      goal_at_risk: false,
      confidence_level: 'low',
      suggestion: 'No spending recorded this month yet.',
    }

    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [
          { data: null, error: { message: 'no rows' } }, // no cached prediction
          { data: [], error: null },                       // transactions
          { data: [], error: null },                       // goals
          { data: savedPrediction, error: null },          // upsert result
        ],
      }) as any
    )

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toHaveProperty('predicted_month_total')
    expect(json.data).toHaveProperty('goal_at_risk')
    expect(json.data).toHaveProperty('suggestion')
    expect(json.data).toHaveProperty('estimatedSavings')
  })

  it('response includes estimatedSavings derived from local engine, not DB', async () => {
    const savedPrediction = {
      id: 'pred-new',
      user_id: TEST_USER.id,
      prediction_date: TODAY,
      predicted_month_total: 500,
      goal_at_risk: false,
      confidence_level: 'medium',
      suggestion: 'Your highest spending is Food at $100.00.',
    }

    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [
          { data: null, error: { message: 'no rows' } },
          { data: [{ amount: 100, type: 'expense', category: 'Food', date: MONTH_START }], error: null },
          { data: [], error: null },
          { data: savedPrediction, error: null },
        ],
      }) as any
    )

    const res = await GET()
    const json = await res.json()

    expect(json.data).toHaveProperty('predicted_month_total')
    expect(json.data).toHaveProperty('goal_at_risk')
    expect(json.data).toHaveProperty('suggestion')
    // estimatedSavings comes from the local engine and is not a DB column
    expect(json.data).toHaveProperty('estimatedSavings')
    expect(typeof json.data.estimatedSavings).toBe('number')
  })
})
