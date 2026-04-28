/**
 * api/_lib/db.ts
 *
 * @libsql/client/http 를 사용합니다.
 * - /http 엔트리포인트는 WebSocket 없이 순수 HTTPS 통신 → Vercel 서버리스 완벽 호환
 * - 일반 @libsql/client 는 WebSocket 을 시도해 Vercel 환경에서 hang/timeout 발생
 */
import { createClient } from '@libsql/client/http'

// ─── 싱글턴 ────────────────────────────────────────────────────────────────────
// Vercel 서버리스: cold-start 마다 모듈이 새로 로드되므로 인스턴스도 초기화됨
// warm 재사용 시에는 이전 인스턴스가 그대로 유지됨
let _client: ReturnType<typeof createClient> | null = null
let _schemaReady = false

export async function getDb() {
  // 1. 환경 변수 확인
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  console.log('[db] TURSO_DATABASE_URL:', url ? `set (${url.slice(0, 30)}...)` : 'MISSING')
  console.log('[db] TURSO_AUTH_TOKEN:', authToken ? 'set' : 'MISSING')

  if (!url) {
    throw new Error(
      'TURSO_DATABASE_URL 환경 변수가 없습니다. ' +
        'Vercel → Project Settings → Environment Variables 에서 추가하세요.'
    )
  }

  // 2. 클라이언트 생성 (최초 1회)
  if (!_client) {
    // libsql:// → https:// 로 변환 (HTTP 클라이언트 요구사항)
    const httpUrl = url.replace(/^libsql:\/\//, 'https://')
    console.log('[db] creating client, url scheme:', httpUrl.slice(0, 8))
    _client = createClient({ url: httpUrl, authToken: authToken ?? undefined })
  }

  // 3. 스키마 초기화 (cold-start 1회, 이후 skip)
  if (!_schemaReady) {
    console.log('[db] running ensureSchema...')
    await ensureSchema()
    _schemaReady = true
    console.log('[db] schema ready')
  }

  return _client
}

// ─── 스키마 초기화 ─────────────────────────────────────────────────────────────
async function ensureSchema() {
  if (!_client) throw new Error('DB client not initialized')

  const statements = [
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
  ]

  // 개별 실행 (batch DDL 이 일부 버전에서 불안정)
  for (const sql of statements) {
    await _client.execute({ sql, args: [] })
  }
}

// ─── Row → primitive 변환 헬퍼 ────────────────────────────────────────────────
export function toStr(v: unknown): string {
  return v == null ? '' : String(v)
}
export function toNum(v: unknown): number {
  return v == null ? 0 : Number(v)
}
export function toNullStr(v: unknown): string | null {
  return v == null ? null : String(v)
}
