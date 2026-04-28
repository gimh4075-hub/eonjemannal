import type { VercelRequest, VercelResponse } from '@vercel/node'
import { nanoid } from 'nanoid'
import { getDb } from '../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { title, description, hostName, dateRangeStart, dateRangeEnd } = req.body ?? {}

  if (!title || !hostName || !dateRangeStart || !dateRangeEnd) {
    return res.status(400).json({ error: '필수 항목이 누락되었습니다.' })
  }

  const start = new Date(dateRangeStart)
  const end = new Date(dateRangeEnd)
  const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

  if (diffDays < 0) {
    return res.status(400).json({ error: '종료일은 시작일 이후여야 합니다.' })
  }
  if (diffDays > 60) {
    return res.status(400).json({ error: '날짜 범위는 최대 60일까지 선택할 수 있습니다.' })
  }

  try {
    const db = getDb()
    const eventId = nanoid(8)
    const participantId = nanoid(12)
    const now = Date.now()

    await db.batch([
      {
        sql: `INSERT INTO events (id, title, description, host_name, date_range_start, date_range_end, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [eventId, title, description ?? null, hostName, dateRangeStart, dateRangeEnd, now],
      },
      {
        sql: `INSERT INTO participants (id, event_id, name, joined_at) VALUES (?, ?, ?, ?)`,
        args: [participantId, eventId, hostName, now],
      },
    ])

    return res.json({ eventId, participantId, shareUrl: `/event/${eventId}` })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: '이벤트 생성 중 오류가 발생했습니다.' })
  }
}
