import type { VercelRequest, VercelResponse } from '@vercel/node'
import { nanoid } from 'nanoid'
import { getDb, toStr } from '../../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const eventId = req.query.eventId as string
  const { name } = req.body ?? {}

  if (!name || !String(name).trim()) {
    return res.status(400).json({ error: '이름을 입력해주세요.' })
  }

  try {
    const db = getDb()

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

    return res.json({ participantId, name: trimmedName })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: '참여 중 오류가 발생했습니다.' })
  }
}
