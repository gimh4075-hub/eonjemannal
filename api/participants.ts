import { getDb } from './_lib/db'

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { participantId, eventId } = req.body ?? {}
    if (!participantId || !eventId) {
      return res.status(400).json({ error: 'participantId와 eventId가 필요합니다.' })
    }

    const { execute } = await getDb()

    // 참여자 존재 확인
    const check = await execute(
      'SELECT id FROM participants WHERE id=? AND event_id=?',
      [participantId, eventId]
    )
    if (check.rows.length === 0) {
      return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' })
    }

    // 관련 데이터 순서대로 삭제
    await execute('DELETE FROM votes WHERE participant_id=? AND event_id=?', [participantId, eventId])
    await execute('DELETE FROM availability WHERE participant_id=? AND event_id=?', [participantId, eventId])
    await execute('DELETE FROM participants WHERE id=?', [participantId])

    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : String(err) })
  }
}
