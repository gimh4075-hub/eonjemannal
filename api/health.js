'use strict';

// GET /api/health — 배포 진단 엔드포인트
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const checks = {
    timestamp: new Date().toISOString(),
    node_version: process.version,
    TURSO_DATABASE_URL: process.env.TURSO_DATABASE_URL
      ? `set → ${process.env.TURSO_DATABASE_URL.slice(0, 40)}...`
      : '❌ MISSING',
    TURSO_AUTH_TOKEN: process.env.TURSO_AUTH_TOKEN ? '✅ set' : '❌ MISSING',
  };

  console.log('[GET /api/health] env check:', checks);

  try {
    const { getDb } = require('./_lib/db');
    const db = await getDb();
    checks.db_client = '✅ created';

    const tables = ['events', 'participants', 'availability', 'votes'];
    for (const t of tables) {
      const r = await db.execute({ sql: `SELECT COUNT(*) AS n FROM ${t}`, args: [] });
      checks[`table_${t}`] = `✅ ${r.rows[0].n} rows`;
    }

    console.log('[GET /api/health] all checks passed');
    return res.status(200).json({ status: 'ok', checks });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    checks.db_error = message;
    console.error('[GET /api/health] DB error:', message);
    return res.status(500).json({ status: 'error', checks });
  }
};
