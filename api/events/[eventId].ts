// Stub — route replaced by flat api/events.js + query param ?id=
// This file exists only to prevent 404 on old bookmarked URLs.
export default async function handler(_req: any, res: any) {
  return res.status(404).json({ error: 'Use /api/events?id=<eventId>' })
}
