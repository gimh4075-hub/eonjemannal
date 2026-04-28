import type { VercelRequest, VercelResponse } from '@vercel/node'
import { nanoid } from 'nanoid'
import { getDb, toStr, toNum } from '../../_lib/db'

// GET + POST /api/events/:eventId/availability
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const eventId = req.query.eventId as string
  console.log(`[${req.method} /api/events/${eventId}/availability]`)

  if (req.method === 'GET') return handleGet(res, eventId)
  if (req.method === 'POST') return handlePost(req, res, eventId)
  return res.status(405).json({ error: 'Method not allowed' })
}

async function handleGet(res: VercelResponse, eventId: string) {
  try {
    const db = await getDb()

    const eventCheck = await db.execute({
      sql: 'SELECT id FROM events WHERE id = ?',
      args: [eventId],
    })
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' })
    }

    const [participantsResult, availResult] = await Promise.all([
      db.execute({
        sql: 'SELECT * FROM participants WHERE event_id = ? ORDER BY joined_at ASC',
        args: [eventId],
      }),
      db.execute({
        sql: 'SELECT * FROM availability WHERE event_id = ?',
        args: [eventId],
      }),
    ])

    console.log(`[GET availability] participants=${participantsResult.rows.length} avail=${availResult.rows.length}`)

    const participants = participantsResult.rows.map(r => ({
      id: toStr(r.id),
      event_id: toStr(r.event_id),
      name: toStr(r.name),
      joined_at: toNum(r.joined_at),
    }))

    const allAvail = availResult.rows.map(r => ({
      participant_id: toStr(r.participant_id),
      date: toStr(r.date),
    }))

    const availability: Record<string, string[]> = {}
    for (const p of participants) {
      availability[p.id] = allAvail.filter(a => a.participant_id === p.id).map(a => a.date)
    }

    const dateMap: Record<string, string[]> = {}
    for (const a of allAvail) {
      if (!dateMap[a.date]) dateMap[a.date] = []
      dateMap[a.date].push(a.participant_id)
    }

    const totalParticipants = participants.length
    const overlaps = Object.entries(dateMap)
      .map(([date, pIds]) => ({
        date,
        count: pIds.length,
        participants: pIds.map(pid => participants.find(x => x.id === pid)?.name ?? pid),
        isPerfectMatch: totalParticipants > 0 && pIds.length === totalParticipants,
      }))
      .sort((a, b) => b.count - a.count)

    return res.json({ participants, availability, overlaps, totalParticipants })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[GET /api/events/${eventId}/availability] ERROR:`, message)
    return res.status(500).json({ error: '가용 날짜 조회 중 오류가 발생했습니다.', detail: message })
  }
}

async function handlePost(req: VercelRequest, res: VercelResponse, eventId: string) {
  try {
    const { participantId, dates } = req.body ?? {}
    console.log(`[POST availability] participantId=${participantId} dates=${JSON.stringify(dates)}`)

    if (!participantId || !Array.isArray(dates)) {
      return res.status(400).json({ error: '잘못된 요청입니다. participantId와 dates[] 가 필요합니다.' })
    }

    const db = await getDb()

    const pCheck = await db.execute({
      sql: 'SELECT id FROM participants WHERE id = ? AND event_id = ?',
      args: [participantId, eventId],
    })
    if (pCheck.rows.length === 0) {
      return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' })
    }

    // delete → insert (개별 실행으로 안정성 확보)
    await db.execute({
      sql: 'DELETE FROM availability WHERE participant_id = ? AND event_id = ?',
      args: [participantId, eventId],
    })

    for (const date of dates as string[]) {
      await db.execute({
        sql: 'INSERT INTO availability (id, participant_id, event_id, date) VALUES (?, ?, ?, ?)',
        args: [nanoid(12), participantId, eventId, date],
      })
    }

    console.log(`[POST availability] saved ${dates.length} dates for ${participantId}`)
    return res.json({ success: true })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[POST /api/events/${eventId}/availability] ERROR:`, message)
    return res.status(500).json({ error: '가용 날짜 저장 중 오류가 발생했습니다.', detail: message })
  }
}
