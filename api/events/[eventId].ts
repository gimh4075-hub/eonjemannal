import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, toStr, toNum, toNullStr } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const eventId = req.query.eventId as string

  try {
    const db = getDb()

    const eventResult = await db.execute({
      sql: 'SELECT * FROM events WHERE id = ?',
      args: [eventId],
    })

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

    const participants = participantsResult.rows.map(r => ({
      id: toStr(r.id),
      event_id: toStr(r.event_id),
      name: toStr(r.name),
      joined_at: toNum(r.joined_at),
    }))

    return res.json({ event, participants })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: '이벤트 조회 중 오류가 발생했습니다.' })
  }
}
