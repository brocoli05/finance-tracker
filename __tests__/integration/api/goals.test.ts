/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server')

import { GET, POST } from '@/app/api/goals/route'
import { PUT, DELETE } from '@/app/api/goals/[id]/route'
import { PATCH } from '@/app/api/goals/[id]/progress/route'
import { createClient } from '@/lib/supabase/server'
import { createMockSupabaseClient } from '../../mocks/supabase.mock'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const TEST_USER = { id: 'user-123', email: 'test@example.com' }

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
      : {}),
  })
}

const VALID_GOAL = {
  title: 'Emergency Fund',
  target_amount: 5000,
  deadline: '2026-12-31',
  category: 'savings',
}

const GOAL_RECORD = {
  id: 'goal-1',
  ...VALID_GOAL,
  current_amount: 0,
  is_achieved: false,
  user_id: TEST_USER.id,
}

describe('Goals CRUD cycle', () => {
  beforeEach(() => jest.clearAllMocks())

  it('POST /api/goals creates a goal and returns 201', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [{ data: GOAL_RECORD, error: null }],
      }) as any
    )

    const res = await POST(jsonRequest('/api/goals', 'POST', VALID_GOAL))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data).toMatchObject({ title: 'Emergency Fund', is_achieved: false, current_amount: 0 })
    expect(json.error).toBeNull()
  })

  it('GET /api/goals returns 200 with array of goals', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [{ data: [GOAL_RECORD], error: null }],
      }) as any
    )

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.data).toHaveLength(1)
    expect(json.data[0]).toMatchObject({ title: 'Emergency Fund' })
  })

  it('PUT /api/goals/[id] updates a goal and returns 200', async () => {
    const updatedGoal = { ...GOAL_RECORD, title: 'Big Emergency Fund', target_amount: 10000 }
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [
          { data: { id: 'goal-1' }, error: null }, // ownership check
          { data: updatedGoal, error: null },        // update result
        ],
      }) as any
    )

    const res = await PUT(
      jsonRequest('/api/goals/goal-1', 'PUT', {
        title: 'Big Emergency Fund',
        target_amount: 10000,
        deadline: '2026-12-31',
        category: 'savings',
      }),
      { params: Promise.resolve({ id: 'goal-1' }) }
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toMatchObject({ title: 'Big Emergency Fund', target_amount: 10000 })
  })

  it('DELETE /api/goals/[id] removes a goal and returns 200', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [
          { data: { id: 'goal-1' }, error: null }, // ownership check
          { data: null, error: null },               // delete
        ],
      }) as any
    )

    const res = await DELETE(
      jsonRequest('/api/goals/goal-1', 'DELETE'),
      { params: Promise.resolve({ id: 'goal-1' }) }
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toEqual({ id: 'goal-1' })
  })
})

describe('PATCH /api/goals/[id]/progress', () => {
  beforeEach(() => jest.clearAllMocks())

  it('adds amount to current_amount and returns updated goal', async () => {
    const existing = { ...GOAL_RECORD, current_amount: 1000 }
    const updated = { ...existing, current_amount: 1500, is_achieved: false }
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [
          { data: existing, error: null }, // fetch for ownership + existing values
          { data: updated, error: null },  // update result
        ],
      }) as any
    )

    const res = await PATCH(
      jsonRequest('/api/goals/goal-1/progress', 'PATCH', { amount: 500 }),
      { params: Promise.resolve({ id: 'goal-1' }) }
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.current_amount).toBe(1500)
    expect(json.data.is_achieved).toBe(false)
  })

  it('flips is_achieved to true when current_amount reaches target_amount', async () => {
    const existing = { ...GOAL_RECORD, current_amount: 4500, target_amount: 5000 }
    const updated = { ...existing, current_amount: 5000, is_achieved: true }
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [
          { data: existing, error: null },
          { data: updated, error: null },
        ],
      }) as any
    )

    const res = await PATCH(
      jsonRequest('/api/goals/goal-1/progress', 'PATCH', { amount: 500 }),
      { params: Promise.resolve({ id: 'goal-1' }) }
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data.current_amount).toBe(5000)
    expect(json.data.is_achieved).toBe(true)
  })
})
