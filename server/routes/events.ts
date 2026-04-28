import { Router, Request, Response } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db'

const router = Router()

// POST /api/events
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, description, hostName, dateRangeStart, dateRangeEnd } = req.body

    if (!title || !hostName || !dateRangeStart || !dateRangeEnd) {
      return res.status(400).json({ error: '필수 항목이 누락되었습니다.' })
    }

    const start = new Date(dateRangeStart)
    const end = new Date(dateRangeEnd)
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays < 0) return res.status(400).json({ error: '종료일은 시작일 이후여야 합니다.' })
    if (diffDays > 60) return res.status(400).json({ error: '날짜 범위는 최대 60일까지 선택할 수 있습니다.' })

    const eventId = nanoid(8)
    const participantId = nanoid(12)
    const now = Date.now()

    await db.batch(
      [
        {
          sql: `INSERT INTO events (id, title, description, host_name, date_range_start, date_range_end, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)`,
          args: [eventId, title, description ?? null, hostName, dateRangeStart, dateRangeEnd, now],
        },
        {
          sql: `INSERT INTO participants (id, event_id, name, joined_at) VALUES (?, ?, ?, ?)`,
          args: [participantId, eventId, hostName, now],
        },
      ],
      'write'
    )

    return res.status(201).json({ eventId, participantId, shareUrl: `/event/${eventId}` })
  } catch (err) {
    console.error('[POST /api/events]', err)
    return res.status(500).json({ error: '이벤트 생성 중 오류가 발생했습니다.' })
  }
})

// GET /api/events/:eventId
router.get('/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params

    const eventResult = await db.execute({
      sql: 'SELECT * FROM events WHERE id = ?',
      args: [eventId],
    })

    if (eventResult.rows.length === 0) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' })
    }

    const r = eventResult.rows[0]
    const event = {
      id: String(r.id),
      title: String(r.title),
      description: r.description != null ? String(r.description) : null,
      host_name: String(r.host_name),
      date_range_start: String(r.date_range_start),
      date_range_end: String(r.date_range_end),
      created_at: Number(r.created_at),
    }

    const participantsResult = await db.execute({
      sql: 'SELECT * FROM participants WHERE event_id = ? ORDER BY joined_at ASC',
      args: [eventId],
    })

    const participants = participantsResult.rows.map(p => ({
      id: String(p.id),
      event_id: String(p.event_id),
      name: String(p.name),
      joined_at: Number(p.joined_at),
    }))

    return res.json({ event, participants })
  } catch (err) {
    console.error('[GET /api/events/:eventId]', err)
    return res.status(500).json({ error: '이벤트 조회 중 오류가 발생했습니다.' })
  }
})

export default router
