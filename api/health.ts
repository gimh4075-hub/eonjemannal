import { execute, getDb } from './_lib/db'

export default async function handler(_req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')

  const checks: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL
      ? `set → ${process.env.TURSO_DATABASE_URL.slice(0, 40)}...`
      : '❌ MISSING',
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? '✅ set' : '❌ MISSING',
  }

  try {
    await getDb()
    checks.db_connected = '✅ ok'
    for (const t of ['events', 'participants', 'availability', 'votes']) {
      const r = await execute(`SELECT COUNT(*) AS n FROM ${t}`)
      checks[`table_${t}`] = `✅ ${r.rows[0].n} rows`
    }
    return res.status(200).json({ status: 'ok', checks })
  } catch (err) {
    checks.db_error = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ status: 'error', checks })
  }
}
