'use strict';

const { nanoid } = require('nanoid');
const { getDb, toStr, toNum } = require('./_lib/db');

// POST /api/events  — create event
// GET  /api/events?id=xxx  — get event + participants
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  console.log(`[${req.method} /api/events]`);

  try {
    const db = await getDb();

    if (req.method === 'POST') {
      const { title, description, hostName, dateRangeStart, dateRangeEnd } = req.body ?? {};
      console.log('[POST /api/events]', { title, hostName, dateRangeStart, dateRangeEnd });

      if (!title || !hostName || !dateRangeStart || !dateRangeEnd) {
        return res.status(400).json({ error: '필수 항목이 없습니다. title, hostName, dateRangeStart, dateRangeEnd 가 필요합니다.' });
      }

      const id = nanoid(12);
      await db.execute({
        sql: 'INSERT INTO events (id, title, description, host_name, date_range_start, date_range_end, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        args: [id, title, description ?? null, hostName, dateRangeStart, dateRangeEnd, Date.now()],
      });

      console.log('[POST /api/events] created', id);
      return res.status(201).json({ id, title, hostName, dateRangeStart, dateRangeEnd });
    }

    if (req.method === 'GET') {
      const id = req.query.id;
      if (!id) return res.status(400).json({ error: 'id 쿼리 파라미터가 필요합니다.' });

      const [eventResult, participantsResult] = await Promise.all([
        db.execute({ sql: 'SELECT * FROM events WHERE id = ?', args: [id] }),
        db.execute({ sql: 'SELECT * FROM participants WHERE event_id = ? ORDER BY joined_at ASC', args: [id] }),
      ]);

      if (eventResult.rows.length === 0) {
        return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
      }

      const r = eventResult.rows[0];
      const event = {
        id: toStr(r.id),
        title: toStr(r.title),
        description: toStr(r.description),
        hostName: toStr(r.host_name),
        dateRangeStart: toStr(r.date_range_start),
        dateRangeEnd: toStr(r.date_range_end),
        createdAt: toNum(r.created_at),
      };

      const participants = participantsResult.rows.map(p => ({
        id: toStr(p.id),
        eventId: toStr(p.event_id),
        name: toStr(p.name),
        joinedAt: toNum(p.joined_at),
      }));

      return res.json({ event, participants });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/events] ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
