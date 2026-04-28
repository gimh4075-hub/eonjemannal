import { createClient, type Client } from '@libsql/client'

// ─── Singleton: one client per serverless function instance (warm reuse) ──────
let _client: Client | null = null
let _schemaReady = false

export async function getDb(): Promise<Client> {
  if (!_client) {
    const url = process.env.TURSO_DATABASE_URL
    const authToken = process.env.TURSO_AUTH_TOKEN

    if (!url) {
      throw new Error(
        'TURSO_DATABASE_URL 환경 변수가 설정되지 않았습니다. ' +
          'Vercel 대시보드 → Settings → Environment Variables 에서 추가하세요.'
      )
    }

    _client = createClient({ url, authToken: authToken ?? undefined })
  }

  // Auto-initialize schema once per cold start (idempotent)
  if (!_schemaReady) {
    await ensureSchema(_client)
    _schemaReady = true
  }

  return _client
}

// ─── Schema bootstrap (CREATE TABLE IF NOT EXISTS = safe to run repeatedly) ───
async function ensureSchema(db: Client) {
  await db.batch(
    [
      `CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        host_name TEXT NOT NULL,
        date_range_start TEXT NOT NULL,
        date_range_end TEXT NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS participants (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        name TEXT NOT NULL,
        joined_at INTEGER NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id)
      )`,
      `CREATE TABLE IF NOT EXISTS availability (
        id TEXT PRIMARY KEY,
        participant_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (participant_id) REFERENCES participants(id),
        FOREIGN KEY (event_id) REFERENCES events(id)
      )`,
      `CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        participant_id TEXT NOT NULL,
        date TEXT NOT NULL,
        FOREIGN KEY (event_id) REFERENCES events(id),
        FOREIGN KEY (participant_id) REFERENCES participants(id)
      )`,
    ].map(sql => ({ sql, args: [] })),
    'deferred'
  )
}

// ─── Row-value helpers (libsql Value = string | number | bigint | null | ArrayBuffer) ──
export function toStr(v: unknown): string {
  return v == null ? '' : String(v)
}
export function toNum(v: unknown): number {
  return v == null ? 0 : Number(v)
}
export function toNullStr(v: unknown): string | null {
  return v == null ? null : String(v)
}
