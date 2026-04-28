import type { VercelRequest, VercelResponse } from '@vercel/node'
import { nanoid } from 'nanoid'
import { getDb } from '../../_lib/db'

// POST /api/events/:eventId/vote
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const eventId = req.query.eventId as string
  console.log(`[POST /api/events/${eventId}/vote] method=${req.method}`)

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { participantId, date } = req.body ?? {}
    console.log(`[POST vote] participantId=${participantId} date=${date}`)

    if (!participantId || !date) {
      return res.status(400).json({ error: '잘못된 요청입니다. participantId와 date가 필요합니다.' })
    }

    const db = await getDb()

    const pCheck = await db.execute({
      sql: 'SELECT id FROM participants WHERE id = ? AND event_id = ?',
      args: [participantId, eventId],
    })
    if (pCheck.rows.length === 0) {
      return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' })
    }

    // Upsert: 기존 투표 삭제 후 새 투표 삽입
    await db.execute({
      sql: 'DELETE FROM votes WHERE event_id = ? AND participant_id = ?',
      args: [eventId, participantId],
    })
    await db.execute({
      sql: 'INSERT INTO votes (id, event_id, participant_id, date) VALUES (?, ?, ?, ?)',
      args: [nanoid(12), eventId, participantId, date],
    })

    console.log(`[POST vote] success`)
    return res.json({ success: true })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[POST /api/events/${eventId}/vote] ERROR:`, message)
    return res.status(500).json({ error: '투표 중 오류가 발생했습니다.', detail: message })
  }
}
