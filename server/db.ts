import { createClient, type Client } from '@libsql/client'
import { config } from 'dotenv'
import { resolve } from 'path'

// .env.local 로드 (로컬 개발용)
config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  console.error('❌ TURSO_DATABASE_URL 이 없습니다. .env.local 파일을 확인하세요.')
  process.exit(1)
}

export const db: Client = createClient({ url, authToken: authToken ?? undefined })

// 스키마 초기화 (서버 시작 시 1회 실행)
export async function initSchema() {
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
  console.log('✅ DB 스키마 준비 완료')
}
