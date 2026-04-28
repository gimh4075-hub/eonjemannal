'use strict';

const { nanoid } = require('nanoid');
const { getDb, toStr } = require('./_lib/db');

// POST /api/join  — body: { eventId, name } → { participantId, name }
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  console.log(`[${req.method} /api/join]`);

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { eventId, name } = req.body ?? {};
    console.log('[POST /api/join]', { eventId, name });

    if (!eventId || !name || !String(name).trim()) {
      return res.status(400).json({ error: 'eventId 와 name 이 필요합니다.' });
    }

    const db = await getDb();

    const eventCheck = await db.execute({ sql: 'SELECT id FROM events WHERE id = ?', args: [eventId] });
    if (eventCheck.rows.length === 0) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }

    const trimmedName = String(name).trim();
    const participantId = nanoid(12);

    await db.execute({
      sql: 'INSERT INTO participants (id, event_id, name, joined_at) VALUES (?, ?, ?, ?)',
      args: [participantId, eventId, trimmedName, Date.now()],
    });

    console.log('[POST /api/join] created participantId', participantId);
    return res.status(201).json({ participantId, name: trimmedName });
  } catch (err) {
    console.error('[/api/join] ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
