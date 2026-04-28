import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, toStr, toNum, toNullStr } from '../_lib/db'

// GET /api/events/:eventId
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const eventId = req.query.eventId as string
  console.log(`[GET /api/events/${eventId}] method=${req.method}`)

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  if (!eventId) return res.status(400).json({ error: 'eventId가 필요합니다.' })

  try {
    console.log(`[GET /api/events/${eventId}] connecting to DB...`)
    const db = await getDb()

    const eventResult = await db.execute({
      sql: 'SELECT * FROM events WHERE id = ?',
      args: [eventId],
    })
    console.log(`[GET /api/events/${eventId}] found ${eventResult.rows.length} event(s)`)

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' })
    }

    const row = eventResult.rows[0]
    const event = {
      id: toStr(row.id),
      title: toStr(row.title),
      description: toNullStr(row.description),
      host_name: toStr(row.host_name),
      date_range_start: toStr(row.date_range_start),
      date_range_end: toStr(row.date_range_end),
      created_at: toNum(row.created_at),
    }

    const participantsResult = await db.execute({
      sql: 'SELECT * FROM participants WHERE event_id = ? ORDER BY joined_at ASC',
      args: [eventId],
    })
    console.log(`[GET /api/events/${eventId}] found ${participantsResult.rows.length} participant(s)`)

    const participants = participantsResult.rows.map(r => ({
      id: toStr(r.id),
      event_id: toStr(r.event_id),
      name: toStr(r.name),
      joined_at: toNum(r.joined_at),
    }))

    return res.json({ event, participants })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[GET /api/events/${eventId}] ERROR:`, message)
    return res.status(500).json({ error: '이벤트 조회 중 오류가 발생했습니다.', detail: message })
  }
}
