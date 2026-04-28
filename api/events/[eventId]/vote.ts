import type { VercelRequest, VercelResponse } from '@vercel/node'
import { nanoid } from 'nanoid'
import { getDb } from '../../_lib/db'

// POST /api/events/:eventId/vote
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const eventId = req.query.eventId as string
  const { participantId, date } = req.body ?? {}

  if (!participantId || !date) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }

  try {
    const db = await getDb()

    const pCheck = await db.execute({
      sql: 'SELECT id FROM participants WHERE id = ? AND event_id = ?',
      args: [participantId, eventId],
    })
    if (pCheck.rows.length === 0) {
      return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' })
    }

    // Upsert: delete old vote → insert new
    await db.batch(
      [
        {
          sql: 'DELETE FROM votes WHERE event_id = ? AND participant_id = ?',
          args: [eventId, participantId],
        },
        {
          sql: 'INSERT INTO votes (id, event_id, participant_id, date) VALUES (?, ?, ?, ?)',
          args: [nanoid(12), eventId, participantId, date],
        },
      ],
      'write'
    )

    return res.json({ success: true })
  } catch (err) {
    console.error('[POST /api/events/:eventId/vote]', err)
    return res.status(500).json({ error: '투표 중 오류가 발생했습니다.' })
  }
}
