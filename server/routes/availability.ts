import { Router, Request, Response } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db'

const router = Router()

// POST /api/events/:eventId/join
router.post('/:eventId/join', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params
    const { name } = req.body

    if (!name || !String(name).trim()) {
      return res.status(400).json({ error: '이름을 입력해주세요.' })
    }

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

    return res.status(201).json({ participantId, name: trimmedName })
  } catch (err) {
    console.error('[POST /api/events/:eventId/join]', err)
    return res.status(500).json({ error: '참여 중 오류가 발생했습니다.' })
  }
})

// POST /api/events/:eventId/availability
router.post('/:eventId/availability', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params
    const { participantId, dates } = req.body

    if (!participantId || !Array.isArray(dates)) {
      return res.status(400).json({ error: '잘못된 요청입니다.' })
    }

    const pCheck = await db.execute({
      sql: 'SELECT id FROM participants WHERE id = ? AND event_id = ?',
      args: [participantId, eventId],
    })
    if (pCheck.rows.length === 0) {
      return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' })
    }

    const inserts = (dates as string[]).map(date => ({
      sql: 'INSERT INTO availability (id, participant_id, event_id, date) VALUES (?, ?, ?, ?)',
      args: [nanoid(12), participantId, eventId, date],
    }))

    await db.batch(
      [
        {
          sql: 'DELETE FROM availability WHERE participant_id = ? AND event_id = ?',
          args: [participantId, eventId],
        },
        ...inserts,
      ],
      'write'
    )

    return res.json({ success: true })
  } catch (err) {
    console.error('[POST /api/events/:eventId/availability]', err)
    return res.status(500).json({ error: '가용 날짜 저장 중 오류가 발생했습니다.' })
  }
})

// GET /api/events/:eventId/availability
router.get('/:eventId/availability', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params

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

    const participants = participantsResult.rows.map(p => ({
      id: String(p.id),
      event_id: String(p.event_id),
      name: String(p.name),
      joined_at: Number(p.joined_at),
    }))

    const allAvail = availResult.rows.map(a => ({
      participant_id: String(a.participant_id),
      date: String(a.date),
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
        participants: pIds.map(pid => {
          const p = participants.find(x => x.id === pid)
          return p ? p.name : pid
        }),
        isPerfectMatch: totalParticipants > 0 && pIds.length === totalParticipants,
      }))
      .sort((a, b) => b.count - a.count)

    return res.json({ participants, availability, overlaps, totalParticipants })
  } catch (err) {
    console.error('[GET /api/events/:eventId/availability]', err)
    return res.status(500).json({ error: '가용 날짜 조회 중 오류가 발생했습니다.' })
  }
})

// POST /api/events/:eventId/vote
router.post('/:eventId/vote', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params
    const { participantId, date } = req.body

    if (!participantId || !date) {
      return res.status(400).json({ error: '잘못된 요청입니다.' })
    }

    const pCheck = await db.execute({
      sql: 'SELECT id FROM participants WHERE id = ? AND event_id = ?',
      args: [participantId, eventId],
    })
    if (pCheck.rows.length === 0) {
      return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' })
    }

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
})

// GET /api/events/:eventId/votes
router.get('/:eventId/votes', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params

    const [votesResult, participantsResult] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM votes WHERE event_id = ?', args: [eventId] }),
      db.execute({ sql: 'SELECT id, name FROM participants WHERE event_id = ?', args: [eventId] }),
    ])

    const participants = participantsResult.rows.map(p => ({
      id: String(p.id),
      name: String(p.name),
    }))

    const votes = votesResult.rows.map(v => ({
      participant_id: String(v.participant_id),
      date: String(v.date),
    }))

    const votesByDate: Record<string, { count: number; voters: string[] }> = {}
    for (const v of votes) {
      if (!votesByDate[v.date]) votesByDate[v.date] = { count: 0, voters: [] }
      votesByDate[v.date].count++
      const p = participants.find(x => x.id === v.participant_id)
      votesByDate[v.date].voters.push(p ? p.name : v.participant_id)
    }

    const myVotes: Record<string, string> = {}
    for (const v of votes) {
      myVotes[v.participant_id] = v.date
    }

    return res.json({ votesByDate, myVotes })
  } catch (err) {
    console.error('[GET /api/events/:eventId/votes]', err)
    return res.status(500).json({ error: '투표 결과 조회 중 오류가 발생했습니다.' })
  }
})

export default router
