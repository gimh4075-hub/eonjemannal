// Stub — real implementation is db.js (CommonJS).
// Old nested TypeScript routes import this file; they are also stubs now.
export async function getDb(): Promise<any> {
  throw new Error('Use db.js CommonJS version')
}
export function toStr(v: unknown): string { return v == null ? '' : String(v) }
export function toNum(v: unknown): number { return v == null ? 0 : Number(v) }
export function toNullStr(v: unknown): string | null { return v == null ? null : String(v) }
