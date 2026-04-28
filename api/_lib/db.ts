// Turso HTTP API — no @libsql/client dependency, just native fetch
// Works in any Node 18+ serverless environment

type SqlValue = string | number | null

interface Row { [col: string]: SqlValue }
export interface Result { rows: Row[] }

function getConfig() {
  const raw = process.env.TURSO_DATABASE_URL
  const token = process.env.TURSO_AUTH_TOKEN
  if (!raw) throw new Error('TURSO_DATABASE_URL is not set')
  if (!token) throw new Error('TURSO_AUTH_TOKEN is not set')
  const url = raw.replace(/^libsql:\/\//, 'https://')
  return { url, token }
}

export async function execute(sql: string, args: SqlValue[] = []): Promise<Result> {
  const { url, token } = getConfig()

  const body = {
    requests: [
      {
        type: 'execute',
        stmt: {
          sql,
          args: args.map(v => {
            if (v === null) return { type: 'null' }
            if (typeof v === 'number') return { type: 'integer', value: String(v) }
            return { type: 'text', value: String(v) }
          }),
        },
      },
      { type: 'close' },
    ],
  }

  const res = await fetch(`${url}/v2/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Turso HTTP ${res.status}: ${await res.text()}`)

  const data = await res.json() as any
  const r0 = data?.results?.[0]
  if (r0?.type === 'error') throw new Error(r0.error?.message ?? 'Unknown DB error')

  const result = r0?.response?.result
  if (!result) return { rows: [] }

  const cols: string[] = result.cols.map((c: any) => c.name)
  const rows: Row[] = result.rows.map((row: any[]) => {
    const obj: Row = {}
    cols.forEach((col, i) => {
      const cell = row[i]
      obj[col] = cell.type === 'null' ? null
        : cell.type === 'integer' || cell.type === 'float' ? Number(cell.value)
        : cell.value
    })
    return obj
  })

  return { rows }
}

let _schemaReady = false
export async function getDb() {
  if (!_schemaReady) {
    await ensureSchema()
    _schemaReady = true
  }
  return { execute }
}

async function ensureSchema() {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT,
      host_name TEXT NOT NULL, date_range_start TEXT NOT NULL,
      date_range_end TEXT NOT NULL, created_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY, event_id TEXT NOT NULL,
      name TEXT NOT NULL, joined_at INTEGER NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS availability (
      id TEXT PRIMARY KEY, participant_id TEXT NOT NULL,
      event_id TEXT NOT NULL, date TEXT NOT NULL)`,
    `CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY, event_id TEXT NOT NULL,
      participant_id TEXT NOT NULL, date TEXT NOT NULL)`,
  ]
  for (const sql of stmts) await execute(sql)
}

export const toStr = (v: unknown) => (v == null ? '' : String(v))
export const toNum = (v: unknown) => (v == null ? 0 : Number(v))

// nanoid 대체 — crypto 내장 모듈 사용
import { randomBytes } from 'crypto'
export const nanoid = (n = 12) => randomBytes(n).toString('base64url').slice(0, n)
