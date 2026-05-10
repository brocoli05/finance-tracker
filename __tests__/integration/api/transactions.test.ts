/**
 * @jest-environment node
 */

import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server')

import { GET, POST } from '@/app/api/transactions/route'
import { DELETE } from '@/app/api/transactions/[id]/route'
import { createClient } from '@/lib/supabase/server'
import { createMockSupabaseClient } from '../../mocks/supabase.mock'

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>

const TEST_USER = { id: 'user-123', email: 'test@example.com' }
const OTHER_USER = { id: 'user-other', email: 'other@example.com' }

function jsonRequest(url: string, method: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost${url}`, {
    method,
    ...(body
      ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }
      : {}),
  })
}

describe('GET /api/transactions', () => {
  it('returns 200 with array of transactions', async () => {
    const transactions = [
      { id: 'tx-1', amount: 50, type: 'expense', category: 'food', date: '2026-05-01', user_id: TEST_USER.id },
    ]
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [{ data: transactions, error: null }],
      }) as any
    )

    const res = await GET()
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(Array.isArray(json.data)).toBe(true)
    expect(json.error).toBeNull()
  })
})

describe('POST /api/transactions', () => {
  const validBody = { amount: 50, type: 'expense', category: 'food', date: '2026-05-01' }

  it('returns 201 with created transaction for valid data', async () => {
    const created = { id: 'tx-new', ...validBody, user_id: TEST_USER.id }
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [{ data: created, error: null }],
      }) as any
    )

    const res = await POST(jsonRequest('/api/transactions', 'POST', validBody))
    const json = await res.json()

    expect(res.status).toBe(201)
    expect(json.data).toMatchObject({ id: 'tx-new', amount: 50 })
    expect(json.error).toBeNull()
  })

  it('returns 422 when amount is missing', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({ user: TEST_USER }) as any
    )

    const res = await POST(
      jsonRequest('/api/transactions', 'POST', { type: 'expense', category: 'food', date: '2026-05-01' })
    )

    expect(res.status).toBe(422)
  })
})

describe('DELETE /api/transactions/[id]', () => {
  it('returns 200 when deleting own transaction', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: TEST_USER,
        queryResults: [
          { data: { id: 'tx-1' }, error: null },  // ownership check
          { data: null, error: null },               // delete
        ],
      }) as any
    )

    const res = await DELETE(
      jsonRequest('/api/transactions/tx-1', 'DELETE'),
      { params: Promise.resolve({ id: 'tx-1' }) }
    )
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.data).toEqual({ id: 'tx-1' })
  })

  // Note: the implementation returns 404 (not 403) when a transaction belongs to a different
  // user — it treats it as "not found" for that user, which is a deliberate security choice.
  it('returns 404 when transaction belongs to a different user', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabaseClient({
        user: OTHER_USER,
        queryResults: [
          { data: null, error: { message: 'not found' } },  // ownership check fails
        ],
      }) as any
    )

    const res = await DELETE(
      jsonRequest('/api/transactions/tx-1', 'DELETE'),
      { params: Promise.resolve({ id: 'tx-1' }) }
    )

    expect(res.status).toBe(404)
  })
})
