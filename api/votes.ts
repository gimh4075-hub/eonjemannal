import { getDb, toStr, nanoid } from './_lib/db'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { execute } = await getDb()

    if (req.method === 'GET') {
      const eventId = req.query?.eventId
      if (!eventId) return res.status(400).json({ error: 'eventId 가 필요합니다.' })

      const [vRes, pRes] = await Promise.all([
        execute('SELECT * FROM votes WHERE event_id=?', [eventId]),
        execute('SELECT id, name FROM participants WHERE event_id=?', [eventId]),
      ])

      const participants = pRes.rows.map(r => ({ id: toStr(r.id), name: toStr(r.name) }))
      const votes = vRes.rows.map(r => ({ participantId: toStr(r.participant_id), date: toStr(r.date) }))

      const votesByDate: Record<string, { count: number; voters: string[] }> = {}
      for (const v of votes) {
        if (!votesByDate[v.date]) votesByDate[v.date] = { count: 0, voters: [] }
        votesByDate[v.date].count++
        votesByDate[v.date].voters.push(participants.find(p => p.id === v.participantId)?.name ?? v.participantId)
      }

      const myVotes: Record<string, string> = {}
      for (const v of votes) myVotes[v.participantId] = v.date

      return res.json({ votesByDate, myVotes })
    }

    if (req.method === 'POST') {
      const { eventId, participantId, date } = req.body ?? {}
      if (!eventId || !participantId || !date)
        return res.status(400).json({ error: 'eventId, participantId, date 가 필요합니다.' })

      const pCheck = await execute('SELECT id FROM participants WHERE id=? AND event_id=?', [participantId, eventId])
      if (pCheck.rows.length === 0) return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' })

      await execute('DELETE FROM votes WHERE event_id=? AND participant_id=?', [eventId, participantId])
      await execute('INSERT INTO votes (id, event_id, participant_id, date) VALUES (?,?,?,?)', [nanoid(), eventId, participantId, date])

      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
