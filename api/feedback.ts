import { getDb, toStr, toNum, nanoid } from './_lib/db'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { execute } = await getDb()

    // POST — submit feedback
    if (req.method === 'POST') {
      const { category, message, contact } = req.body ?? {}
      if (!message?.trim()) return res.status(400).json({ error: '내용을 입력해주세요.' })

      const id = nanoid()
      await execute(
        'INSERT INTO feedback (id, category, message, contact, created_at) VALUES (?,?,?,?,?)',
        [id, category ?? 'general', message.trim(), contact?.trim() ?? null, Date.now()]
      )
      return res.status(201).json({ success: true })
    }

    // GET — view feedback (requires secret)
    if (req.method === 'GET') {
      const secret = req.query?.secret
      const envSecret = process.env.FEEDBACK_SECRET
      if (!envSecret || secret !== envSecret) {
        return res.status(401).json({ error: '인증 실패' })
      }
      const result = await execute('SELECT * FROM feedback ORDER BY created_at DESC')
      const list = result.rows.map(r => ({
        id: toStr(r.id),
        category: toStr(r.category),
        message: toStr(r.message),
        contact: toStr(r.contact),
        createdAt: toNum(r.created_at),
        date: new Date(toNum(r.created_at)).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
      }))
      return res.json({ total: list.length, feedback: list })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
