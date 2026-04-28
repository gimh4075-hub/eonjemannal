import { createClient } from '@libsql/client'

export function getDb() {
  const url = process.env.TURSO_DATABASE_URL
  const authToken = process.env.TURSO_AUTH_TOKEN

  if (!url) {
    throw new Error('TURSO_DATABASE_URL 환경 변수가 설정되지 않았습니다.')
  }

  return createClient({ url, authToken: authToken ?? undefined })
}

// ─── Row → typed object helpers ───────────────────────────────────────────────

export function toStr(v: unknown): string {
  return v == null ? '' : String(v)
}
export function toNum(v: unknown): number {
  return v == null ? 0 : Number(v)
}
export function toNullStr(v: unknown): string | null {
  return v == null ? null : String(v)
}
