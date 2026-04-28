import type { VercelRequest, VercelResponse } from '@vercel/node'
import { getDb, toStr } from '../../_lib/db'

// GET /api/events/:eventId/votes
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  const eventId = req.query.eventId as string
  console.log(`[GET /api/events/${eventId}/votes] method=${req.method}`)

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const db = await getDb()

    const [votesResult, participantsResult] = await Promise.all([
      db.execute({ sql: 'SELECT * FROM votes WHERE event_id = ?', args: [eventId] }),
      db.execute({ sql: 'SELECT id, name FROM participants WHERE event_id = ?', args: [eventId] }),
    ])

    console.log(`[GET votes] votes=${votesResult.rows.length} participants=${participantsResult.rows.length}`)

    const participants = participantsResult.rows.map(r => ({
      id: toStr(r.id),
      name: toStr(r.name),
    }))

    const votes = votesResult.rows.map(r => ({
      participant_id: toStr(r.participant_id),
      date: toStr(r.date),
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
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[GET /api/events/${eventId}/votes] ERROR:`, message)
    return res.status(500).json({ error: '투표 결과 조회 중 오류가 발생했습니다.', detail: message })
  }
}
