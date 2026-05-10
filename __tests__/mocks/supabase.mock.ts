export interface QueryResult {
  data: unknown
  error: { message: string } | null
}

export interface MockSupabaseConfig {
  user?: { id: string; email: string } | null
  queryResults?: QueryResult[]
}

export function createMockSupabaseClient(config: MockSupabaseConfig = {}) {
  const {
    user = { id: 'user-123', email: 'test@example.com' },
    queryResults = [],
  } = config

  let callIndex = 0

  function nextResult(): QueryResult {
    return queryResults[callIndex++] ?? { data: null, error: null }
  }

  function makeBuilder() {
    const builder: Record<string, unknown> = {}
    const chainMethods = ['select', 'insert', 'update', 'delete', 'upsert', 'eq', 'order', 'gte', 'filter', 'limit']

    for (const method of chainMethods) {
      builder[method] = jest.fn().mockReturnValue(builder)
    }

    builder['single'] = jest.fn().mockImplementation(() => Promise.resolve(nextResult()))
    // Make the builder thenable so chains without .single() can be awaited directly
    ;(builder as { then: Function }).then = (
      resolve: (v: unknown) => void,
      reject: (e: unknown) => void
    ) => Promise.resolve(nextResult()).then(resolve, reject)

    return builder
  }

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: user ?? null },
        error: user === null ? { message: 'Not authenticated' } : null,
      }),
    },
    from: jest.fn().mockImplementation(() => makeBuilder()),
  }
}
