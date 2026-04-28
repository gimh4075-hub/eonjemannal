import type { VercelRequest, VercelResponse } from '@vercel/node'
import { nanoid } from 'nanoid'
import { getDb } from '../_lib/db'

// POST /api/events
export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log(`[POST /api/events] method=${req.method}`)

  // CORS preflight
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const body = req.body ?? {}
    console.log('[POST /api/events] body keys:', Object.keys(body))

    const { title, description, hostName, dateRangeStart, dateRangeEnd } = body

    if (!title || !hostName || !dateRangeStart || !dateRangeEnd) {
      return res.status(400).json({
        error: '필수 항목이 누락되었습니다.',
        received: { title: !!title, hostName: !!hostName, dateRangeStart: !!dateRangeStart, dateRangeEnd: !!dateRangeEnd },
      })
    }

    const start = new Date(dateRangeStart)
    const end = new Date(dateRangeEnd)
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)

    if (diffDays < 0) return res.status(400).json({ error: '종료일은 시작일 이후여야 합니다.' })
    if (diffDays > 60) return res.status(400).json({ error: '날짜 범위는 최대 60일까지 설정할 수 있습니다.' })

    console.log('[POST /api/events] connecting to DB...')
    const db = await getDb()

    const eventId = nanoid(8)
    const participantId = nanoid(12)
    const now = Date.now()

    console.log(`[POST /api/events] inserting eventId=${eventId}`)

    await db.execute({
      sql: `INSERT INTO events (id, title, description, host_name, date_range_start, date_range_end, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [eventId, title, description ?? null, hostName, dateRangeStart, dateRangeEnd, now],
    })

    await db.execute({
      sql: `INSERT INTO participants (id, event_id, name, joined_at) VALUES (?, ?, ?, ?)`,
      args: [participantId, eventId, hostName, now],
    })

    console.log(`[POST /api/events] success eventId=${eventId}`)
    return res.status(201).json({ eventId, participantId, shareUrl: `/event/${eventId}` })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    const stack = err instanceof Error ? err.stack : undefined
    console.error('[POST /api/events] ERROR:', message, stack)
    return res.status(500).json({ error: '이벤트 생성 중 오류가 발생했습니다.', detail: message })
  }
}
