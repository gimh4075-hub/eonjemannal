/**
 * Turso DB 스키마 초기화 스크립트
 *
 * 사용법:
 *   1. .env.local 에 TURSO_DATABASE_URL 과 TURSO_AUTH_TOKEN 설정
 *   2. npx tsx scripts/init-db.ts
 */
import { createClient } from '@libsql/client'
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.TURSO_DATABASE_URL
const authToken = process.env.TURSO_AUTH_TOKEN

if (!url) {
  console.error('❌ TURSO_DATABASE_URL 환경 변수가 없습니다. .env.local 파일을 확인하세요.')
  process.exit(1)
}

const db = createClient({ url, authToken: authToken ?? undefined })

console.log('🔗 Turso DB 연결 중:', url)

await db.batch([
  {
    sql: `CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      host_name TEXT NOT NULL,
      date_range_start TEXT NOT NULL,
      date_range_end TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )`,
    args: [],
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS participants (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      name TEXT NOT NULL,
      joined_at INTEGER NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id)
    )`,
    args: [],
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS availability (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (participant_id) REFERENCES participants(id),
      FOREIGN KEY (event_id) REFERENCES events(id)
    )`,
    args: [],
  },
  {
    sql: `CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      date TEXT NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id),
      FOREIGN KEY (participant_id) REFERENCES participants(id)
    )`,
    args: [],
  },
])

console.log('✅ 스키마 초기화 완료!')
console.log('  - events 테이블')
console.log('  - participants 테이블')
console.log('  - availability 테이블')
console.log('  - votes 테이블')

db.close()
