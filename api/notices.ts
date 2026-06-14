import { getDb, toStr, toNum, nanoid } from './_lib/db'
import { translateNotice } from './_lib/translate'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  try {
    const { execute } = await getDb()

    // GET — 활성 공지 목록 (공개)
    if (req.method === 'GET') {
      const result = await execute(
        'SELECT * FROM notices WHERE active=1 ORDER BY created_at DESC'
      )
      const notices = result.rows.map(r => {
        const message = toStr(r.message)
        let translations: Record<string, string> | null = null
        const raw = toStr(r.translations)
        if (raw) {
          try { translations = JSON.parse(raw) } catch { translations = null }
        }
        return {
          id: toStr(r.id),
          message,
          translations: translations ?? { ko: message, en: message, ja: message, zh: message },
          type: toStr(r.type),
          createdAt: toNum(r.created_at),
        }
      })
      return res.json({ notices })
    }

    // 이하 관리자 전용 — secret 검증
    const secret = req.query?.secret
    const envSecret = process.env.FEEDBACK_SECRET
    if (!envSecret || secret !== envSecret) {
      return res.status(401).json({ error: '인증 실패' })
    }

    // POST — 공지 등록
    if (req.method === 'POST') {
      const { message, type } = req.body ?? {}
      if (!message?.trim()) return res.status(400).json({ error: '내용을 입력해주세요.' })
      const trimmed = message.trim()
      const id = nanoid()
      const translations = await translateNotice(trimmed)
      await execute(
        'INSERT INTO notices (id, message, type, active, created_at, translations) VALUES (?,?,?,1,?,?)',
        [id, trimmed, type ?? 'info', Date.now(), JSON.stringify(translations)]
      )
      return res.status(201).json({ success: true, id, translations })
    }

    // DELETE — 공지 삭제 (비활성화)
    if (req.method === 'DELETE') {
      const { id } = req.body ?? {}
      if (!id) return res.status(400).json({ error: 'id가 필요합니다.' })
      await execute('UPDATE notices SET active=0 WHERE id=?', [id])
      return res.json({ success: true })
    }

    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
