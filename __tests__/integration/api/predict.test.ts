/**
 * @jest-environment node
 */

// Must be prefixed with "mock" so Jest allows usage inside the hoisted jest.mock() factory
const mockMessagesCreate = jest.fn()

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockMessagesCreate },
  })),
}))

jest.mock('@/lib/supabase/server')

import { GET } from '@/app/api/predict/route'
import { createClient } from '@/lib/supabase/server'
import { createMockSupabaseClient } from '../../mocks/supabase.mock'
import { createMockAnthropicResponse, DEFAULT_PREDICTION } from '../../mocks/anthropic.mock'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const TEST_USER = { id: 'user-123', email: 'test@example.com' }
const TODAY = new Date().toISOString().split('T')[0]

const CACHED_PREDICTION = {
  id: 'pred-cached',
  user_id: TEST_USER.id,
  prediction_date: TODAY,
  predicted_month_total: 1500,
  goal_at_risk: false,
  confidence_level: 'high',
  suggestion: 'Reduce dining out',
}

function makeSavedPrediction(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pred-new',
    user_id: TEST_USER.id,
    prediction_date: TODAY,
    predicted_month_total: DEFAULT_PREDICTION.predictedMonthTotal,
    goal_at_risk: DEFAULT_PREDICTION.goalAtRisk,
    confidence_level: DEFAULT_PREDICTION.confidenceLevel,
    suggestion: DEFAULT_PREDICTION.suggestion,
    ...overrides,
  }
}

describe('GET /api/predict', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns cached result and skips Claude API when prediction exists for today', async () => {
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
    expect(mockMessagesCreate).not.toHaveBeenCalled()
  })

  it('calls Claude API and saves result when no cache exists for today', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [
          { data: null, error: { message: 'no rows' } }, // no cached prediction
          { data: [], error: null },                       // transactions list
          { data: [], error: null },                       // goals list
          { data: makeSavedPrediction(), error: null },    // upsert result
        ],
      }) as any
    )
    mockMessagesCreate.mockResolvedValue(createMockAnthropicResponse())

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
    expect(json.data).toMatchObject({
      predicted_month_total: DEFAULT_PREDICTION.predictedMonthTotal,
      suggestion: DEFAULT_PREDICTION.suggestion,
    })
  })

  it('response shape includes predictedMonthTotal, goalAtRisk, suggestion, and estimatedSavings', async () => {
    const prediction = {
      predictedMonthTotal: 2000,
      goalAtRisk: true,
      confidenceLevel: 'medium' as const,
      suggestion: 'Cut streaming subscriptions',
      estimatedSavings: 300,
    }
    const saved = makeSavedPrediction({
      predicted_month_total: prediction.predictedMonthTotal,
      goal_at_risk: prediction.goalAtRisk,
      confidence_level: prediction.confidenceLevel,
      suggestion: prediction.suggestion,
    })

    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [
          { data: null, error: { message: 'no rows' } },
          { data: [], error: null },
          { data: [], error: null },
          { data: saved, error: null },
        ],
      }) as any
    )
    mockMessagesCreate.mockResolvedValue(createMockAnthropicResponse(prediction))

    const res = await GET()
    const json = await res.json()

    expect(json.data).toHaveProperty('predicted_month_total')
    expect(json.data).toHaveProperty('goal_at_risk')
    expect(json.data).toHaveProperty('suggestion')
    // estimatedSavings comes from the AI response and is appended to the saved record
    expect(json.data).toHaveProperty('estimatedSavings', prediction.estimatedSavings)
  })
})
