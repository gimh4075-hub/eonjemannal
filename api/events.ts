import { getDb, toStr, toNum, nanoid } from './_lib/db'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { execute } = await getDb()

    if (req.method === 'POST') {
      const { title, description, hostName, dateRangeStart, dateRangeEnd } = req.body ?? {}
      if (!title || !hostName || !dateRangeStart || !dateRangeEnd)
        return res.status(400).json({ error: 'title, hostName, dateRangeStart, dateRangeEnd 가 필요합니다.' })

      const id = nanoid()
      await execute(
        'INSERT INTO events (id, title, description, host_name, date_range_start, date_range_end, created_at) VALUES (?,?,?,?,?,?,?)',
        [id, title, description ?? null, hostName, dateRangeStart, dateRangeEnd, Date.now()]
      )
      return res.status(201).json({ id, title, hostName, dateRangeStart, dateRangeEnd })
    }

    if (req.method === 'GET') {
      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'id 쿼리 파라미터가 필요합니다.' })

      const [evRes, pRes] = await Promise.all([
        execute('SELECT * FROM events WHERE id=?', [id]),
        execute('SELECT * FROM participants WHERE event_id=? ORDER BY joined_at ASC', [id]),
      ])
      if (evRes.rows.length === 0) return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' })

      const r = evRes.rows[0]
      return res.json({
        event: {
          id: toStr(r.id), title: toStr(r.title), description: toStr(r.description),
          hostName: toStr(r.host_name), dateRangeStart: toStr(r.date_range_start),
          dateRangeEnd: toStr(r.date_range_end), createdAt: toNum(r.created_at),
        },
        participants: pRes.rows.map(p => ({
          id: toStr(p.id), eventId: toStr(p.event_id),
          name: toStr(p.name), joinedAt: toNum(p.joined_at),
        })),
      })
    }

    if (req.method === 'DELETE') {
      const id = req.query?.id
      if (!id) return res.status(400).json({ error: 'id 쿼리 파라미터가 필요합니다.' })

      await execute('DELETE FROM votes WHERE event_id=?', [id])
      await execute('DELETE FROM availability WHERE event_id=?', [id])
      await execute('DELETE FROM participants WHERE event_id=?', [id])
      await execute('DELETE FROM events WHERE id=?', [id])
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
