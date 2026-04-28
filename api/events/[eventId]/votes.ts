import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, toStr } from '../../_lib/db'

// GET /api/events/:eventId/votes
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const eventId = req.query.eventId as string

  try {
    const db = await getDb()

    const [votesResult, participantsResult] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM votes WHERE event_id = ?', args: [eventId] }),
      db.execute({ sql: 'SELECT id, name FROM participants WHERE event_id = ?', args: [eventId] }),
    ])

    const participants = participantsResult.rows.map(r => ({
      id: toStr(r.id),
      name: toStr(r.name),
    }))

    const votes = votesResult.rows.map(r => ({
      participant_id: toStr(r.participant_id),
      date: toStr(r.date),
    }))

    // date → { count, voters[] }
    const votesByDate: Record<string, { count: number; voters: string[] }> = {}
    for (const v of votes) {
      if (!votesByDate[v.date]) votesByDate[v.date] = { count: 0, voters: [] }
      votesByDate[v.date].count++
      const p = participants.find(x => x.id === v.participant_id)
      votesByDate[v.date].voters.push(p ? p.name : v.participant_id)
    }

    // participantId → voted date (so the UI can show "my vote")
    const myVotes: Record<string, string> = {}
    for (const v of votes) {
      myVotes[v.participant_id] = v.date
    }

    return res.json({ votesByDate, myVotes })
  } catch (err) {
    console.error('[GET /api/events/:eventId/votes]', err)
    return res.status(500).json({ error: '투표 결과 조회 중 오류가 발생했습니다.' })
  }
}
