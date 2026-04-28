'use strict';

const { createClient } = require('@libsql/client/http');

let _db = null;
let _schemaReady = false;

async function getDb() {
  if (!_db) {
    const raw = process.env.TURSO_DATABASE_URL || '';
    if (!raw) throw new Error('TURSO_DATABASE_URL is not set');
    // libsql:// → https:// (required by the /http client)
    const url = raw.replace(/^libsql:\/\//, 'https://');
    const authToken = process.env.TURSO_AUTH_TOKEN || undefined;
    console.log('[db] creating client url prefix:', url.slice(0, 30));
    _db = createClient({ url, authToken });
  }
  if (!_schemaReady) {
    await ensureSchema();
    _schemaReady = true;
    console.log('[db] schema ready');
  }
  return _db;
}

async function ensureSchema() {
  const stmts = [
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
      joined_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS availability (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL,
      event_id TEXT NOT NULL,
      date TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS votes (
      id TEXT PRIMARY KEY,
      event_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      date TEXT NOT NULL
    )`,
  ];
  for (const sql of stmts) {
    await _db.execute({ sql, args: [] });
  }
}

function toStr(v) {
  return v == null ? '' : String(v);
}

function toNum(v) {
  return v == null ? 0 : Number(v);
}

module.exports = { getDb, toStr, toNum };
