// In-memory store for E2E testing, keyed by session ID so parallel tests don't interfere.
// Only active when E2E_TESTING=true and e2e_session cookie is set.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Rec = { [key: string]: any }

const sessionStores = new Map<string, Map<string, Rec[]>>()
let seq = 0

function getTable(sessionId: string, table: string): Rec[] {
  if (!sessionStores.has(sessionId)) sessionStores.set(sessionId, new Map())
  const session = sessionStores.get(sessionId)!
  if (!session.has(table)) session.set(table, [])
  return session.get(table)!
}

class E2EBuilder {
  private readonly _sid: string
  private readonly _table: string
  private _op: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _eqs: [string, any][] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _gtes: [string, any][] = []
  private _orderBy: string | null = null
  private _orderAsc = true
  private _single = false
  private _data: Rec | null = null
  private _upsertConflict: string | null = null

  constructor(sid: string, table: string) {
    this._sid = sid
    this._table = table
  }

  select(): this { return this }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eq(field: string, val: any): this { this._eqs.push([field, val]); return this }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  gte(field: string, val: any): this { this._gtes.push([field, val]); return this }

  order(field: string, opts: { ascending?: boolean } = {}): this {
    this._orderBy = field
    this._orderAsc = opts.ascending !== false
    return this
  }

  single(): this { this._single = true; return this }

  insert(data: Rec): this { this._op = 'insert'; this._data = data; return this }

  update(data: Rec): this { this._op = 'update'; this._data = data; return this }

  upsert(data: Rec, opts?: { onConflict?: string }): this {
    this._op = 'upsert'
    this._data = data
    this._upsertConflict = opts?.onConflict ?? null
    return this
  }

  delete(): this { this._op = 'delete'; return this }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  then<T>(resolve: (val: { data: any; error: null }) => T): Promise<T> {
    return Promise.resolve(this._run()).then(resolve)
  }

  private _match(items: Rec[]): Rec[] {
    return items.filter(item =>
      this._eqs.every(([k, v]) => item[k] === v) &&
      this._gtes.every(([k, v]) => item[k] >= v)
    )
  }

  private _sort(items: Rec[]): Rec[] {
    if (!this._orderBy) return items
    const field = this._orderBy, asc = this._orderAsc
    return [...items].sort((a, b) =>
      a[field] < b[field] ? (asc ? -1 : 1) : a[field] > b[field] ? (asc ? 1 : -1) : 0
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _run(): { data: any; error: null } {
    const col = getTable(this._sid, this._table)

    if (this._op === 'select') {
      const rows = this._sort(this._match(col))
      return { data: this._single ? (rows[0] ?? null) : rows, error: null }
    }

    if (this._op === 'insert') {
      const item: Rec = { id: `e2e-${Date.now()}-${++seq}`, created_at: new Date().toISOString(), ...this._data }
      col.push(item)
      return { data: this._single ? item : [item], error: null }
    }

    if (this._op === 'update') {
      const rows = this._match(col)
      for (const r of rows) Object.assign(r, this._data)
      return { data: this._single ? (rows[0] ?? null) : rows, error: null }
    }

    if (this._op === 'upsert') {
      const d = this._data!
      if (this._upsertConflict) {
        const keys = this._upsertConflict.split(',').map(k => k.trim())
        const existing = col.find(r => keys.every(k => r[k] === d[k]))
        if (existing) { Object.assign(existing, d); return { data: this._single ? existing : [existing], error: null } }
      }
      const item: Rec = { id: `e2e-${Date.now()}-${++seq}`, created_at: new Date().toISOString(), ...d }
      col.push(item)
      return { data: this._single ? item : [item], error: null }
    }

    if (this._op === 'delete') {
      const targets = this._match(col)
      const keep = new Set(targets)
      for (let i = col.length - 1; i >= 0; i--) {
        if (keep.has(col[i])) col.splice(i, 1)
      }
      return { data: targets, error: null }
    }

    return { data: null, error: null }
  }
}

export function e2eFrom(sessionId: string): (table: string) => E2EBuilder {
  return (table: string) => new E2EBuilder(sessionId, table)
}
