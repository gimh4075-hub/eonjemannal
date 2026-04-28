import type { VercelRequest, VercelResponse } from '@vercel/node'
import { nanoid } from 'nanoid'
import { getDb } from '../../_lib/db'

// POST /api/events/:eventId/join
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const eventId = req.query.eventId as string
  console.log(`[POST /api/events/${eventId}/join] method=${req.method}`)

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { name } = req.body ?? {}
    console.log(`[POST /api/events/${eventId}/join] name=${name}`)

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: '이름을 입력해주세요.' })
    }

    const db = await getDb()

    const eventCheck = await db.execute({
      sql: 'SELECT id FROM events WHERE id = ?',
      args: [eventId],
    })
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' })
    }

    const participantId = nanoid(12)
    const trimmedName = String(name).trim()

    await db.execute({
      sql: 'INSERT INTO participants (id, event_id, name, joined_at) VALUES (?, ?, ?, ?)',
      args: [participantId, eventId, trimmedName, Date.now()],
    })

    console.log(`[POST /api/events/${eventId}/join] success participantId=${participantId}`)
    return res.status(201).json({ participantId, name: trimmedName })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[POST /api/events/${eventId}/join] ERROR:`, message)
    return res.status(500).json({ error: '참여 중 오류가 발생했습니다.', detail: message })
  }
}
