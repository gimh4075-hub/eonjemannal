// This file is intentionally left as a stub.
// The real handler is api/events.js (CommonJS) at /api/events.
// Vercel routes /api/events to api/events.js, not this nested file.
export default async function handler(_req: any, res: any) {
  return res.status(404).json({ error: 'use api/events.js' })
}
