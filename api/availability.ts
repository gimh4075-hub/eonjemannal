import { nanoid } from 'nanoid'
import { getDb, toStr, toNum } from './_lib/db'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const db = await getDb()

    if (req.method === 'GET') {
      const eventId = req.query?.eventId
      if (!eventId) return res.status(400).json({ error: 'eventId 가 필요합니다.' })

      const ev = await db.execute({ sql: 'SELECT id FROM events WHERE id=?', args: [eventId] })
      if (ev.rows.length === 0) return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' })

      const [pRes, aRes] = await Promise.all([
        db.execute({ sql: 'SELECT * FROM participants WHERE event_id=? ORDER BY joined_at ASC', args: [eventId] }),
        db.execute({ sql: 'SELECT * FROM availability WHERE event_id=?', args: [eventId] }),
      ])

      const participants = pRes.rows.map(r => ({
        id: toStr(r.id), eventId: toStr(r.event_id), name: toStr(r.name), joinedAt: toNum(r.joined_at),
      }))
      const allAvail = aRes.rows.map(r => ({ participantId: toStr(r.participant_id), date: toStr(r.date) }))

      const availability: Record<string, string[]> = {}
      for (const p of participants)
        availability[p.id] = allAvail.filter(a => a.participantId === p.id).map(a => a.date)

      const dateMap: Record<string, string[]> = {}
      for (const a of allAvail) {
        if (!dateMap[a.date]) dateMap[a.date] = []
        dateMap[a.date].push(a.participantId)
      }

      const total = participants.length
      const overlaps = Object.entries(dateMap)
        .map(([date, pIds]) => ({
          date, count: pIds.length,
          participants: pIds.map(pid => participants.find(x => x.id === pid)?.name ?? pid),
          isPerfectMatch: total > 0 && pIds.length === total,
        }))
        .sort((a, b) => b.count - a.count)

      return res.json({ participants, availability, overlaps, totalParticipants: total })
    }

    if (req.method === 'POST') {
      const { eventId, participantId, dates } = req.body ?? {}
      if (!eventId || !participantId || !Array.isArray(dates))
        return res.status(400).json({ error: 'eventId, participantId, dates[] 가 필요합니다.' })

      const pCheck = await db.execute({
        sql: 'SELECT id FROM participants WHERE id=? AND event_id=?', args: [participantId, eventId],
      })
      if (pCheck.rows.length === 0) return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' })

      await db.execute({ sql: 'DELETE FROM availability WHERE participant_id=? AND event_id=?', args: [participantId, eventId] })
      for (const date of dates as string[])
        await db.execute({ sql: 'INSERT INTO availability (id, participant_id, event_id, date) VALUES (?,?,?,?)', args: [nanoid(12), participantId, eventId, date] })

      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
