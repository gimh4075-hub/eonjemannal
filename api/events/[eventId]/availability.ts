import type { VercelRequest, VercelResponse } from '@vercel/node'
import { nanoid } from 'nanoid'
import { getDb, toStr, toNum } from '../../_lib/db'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const eventId = req.query.eventId as string

  if (req.method === 'GET') return handleGet(req, res, eventId)
  if (req.method === 'POST') return handlePost(req, res, eventId)
  return res.status(405).json({ error: 'Method not allowed' })
}

// ─── GET: full availability matrix + overlap computation ─────────────────────

async function handleGet(_req: VercelRequest, res: VercelResponse, eventId: string) {
  try {
    const db = getDb()

    const eventResult = await db.execute({
      sql: 'SELECT date_range_start, date_range_end FROM events WHERE id = ?',
      args: [eventId],
    })
    if (eventResult.rows.length === 0) {
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

    const participants = participantsResult.rows.map(r => ({
      id: toStr(r.id),
      event_id: toStr(r.event_id),
      name: toStr(r.name),
      joined_at: toNum(r.joined_at),
    }))

    const allAvail = availResult.rows.map(r => ({
      id: toStr(r.id),
      participant_id: toStr(r.participant_id),
      event_id: toStr(r.event_id),
      date: toStr(r.date),
    }))

    // participantId → dates[]
    const availability: Record<string, string[]> = {}
    for (const p of participants) {
      availability[p.id] = allAvail
        .filter(a => a.participant_id === p.id)
        .map(a => a.date)
    }

    // date → participantIds[]
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
        participants: pIds.map(pid => {
          const p = participants.find(x => x.id === pid)
          return p ? p.name : pid
        }),
        isPerfectMatch: pIds.length === totalParticipants && totalParticipants > 0,
      }))
      .sort((a, b) => b.count - a.count)

    return res.json({ participants, availability, overlaps, totalParticipants })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: '가용 날짜 조회 중 오류가 발생했습니다.' })
  }
}

// ─── POST: submit (replace) availability for one participant ─────────────────

async function handlePost(req: VercelRequest, res: VercelResponse, eventId: string) {
  const { participantId, dates } = req.body ?? {}

  if (!participantId || !Array.isArray(dates)) {
    return res.status(400).json({ error: '잘못된 요청입니다.' })
  }

  try {
    const db = getDb()

    const pCheck = await db.execute({
      sql: 'SELECT id FROM participants WHERE id = ? AND event_id = ?',
      args: [participantId, eventId],
    })
    if (pCheck.rows.length === 0) {
      return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' })
    }

    // Delete existing then insert new — batch for atomicity
    const inserts = (dates as string[]).map(date => ({
      sql: 'INSERT INTO availability (id, participant_id, event_id, date) VALUES (?, ?, ?, ?)',
      args: [nanoid(12), participantId, eventId, date],
    }))

    await db.batch([
      {
        sql: 'DELETE FROM availability WHERE participant_id = ? AND event_id = ?',
        args: [participantId, eventId],
      },
      ...inserts,
    ])

    return res.json({ success: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: '가용 날짜 저장 중 오류가 발생했습니다.' })
  }
}
