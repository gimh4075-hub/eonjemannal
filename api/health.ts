// This file is intentionally left as a stub.
// The real handler is api/health.js (CommonJS).
// Vercel will prefer the .js file for the /api/health route.
export default async function handler(_req: any, res: any) {
  return res.status(404).json({ error: 'use health.js' })
}
