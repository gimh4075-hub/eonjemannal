// Stub — replaced by flat api/availability.js
export default async function handler(_req: any, res: any) {
  return res.status(404).json({ error: 'Use /api/availability?eventId=<eventId>' })
}
