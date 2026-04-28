import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb } from './_lib/db'

/**
 * GET /api/health
 * 배포 진단용 엔드포인트.
 * DB 연결 및 테이블 존재 여부를 확인합니다.
 */
export default async function handler(_req: VercelRequest, res: VercelResponse) {
  const checks: Record<string, string> = {}

  // 1. env vars
  checks.TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL ? '✅ set' : '❌ missing'
  checks.TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN ? '✅ set' : '⚠️ not set (ok for local)'

  try {
    // 2. DB connection + schema init
    const db = await getDb()
    checks.db_connection = '✅ connected'

    // 3. Ping each table
    const tables = ['events', 'participants', 'availability', 'votes']
    for (const t of tables) {
      const r = await db.execute({ sql: `SELECT COUNT(*) as n FROM ${t}`, args: [] })
      checks[`table_${t}`] = `✅ exists (${r.rows[0].n} rows)`
    }

    return res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      checks,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    checks.error = message
    return res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      checks,
    })
  }
}
