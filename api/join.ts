import { getDb, nanoid } from './_lib/db'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { eventId, name } = req.body ?? {}
    if (!eventId || !String(name ?? '').trim())
      return res.status(400).json({ error: 'eventId 와 name 이 필요합니다.' })

    const { execute } = await getDb()
    const ev = await execute('SELECT id FROM events WHERE id=?', [eventId])
    if (ev.rows.length === 0) return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' })

    const participantId = nanoid()
    const trimmedName = String(name).trim()
    await execute(
      'INSERT INTO participants (id, event_id, name, joined_at) VALUES (?,?,?,?)',
      [participantId, eventId, trimmedName, Date.now()]
    )
    return res.status(201).json({ participantId, name: trimmedName })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
