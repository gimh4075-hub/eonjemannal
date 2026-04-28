'use strict';

const { nanoid } = require('nanoid');
const { getDb, toStr } = require('./_lib/db');

// GET  /api/votes?eventId=xxx
// POST /api/votes  — body: { eventId, participantId, date }
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  console.log(`[${req.method} /api/votes]`);

  try {
    const db = await getDb();

    if (req.method === 'GET') {
      const eventId = req.query.eventId;
      if (!eventId) return res.status(400).json({ error: 'eventId 쿼리 파라미터가 필요합니다.' });

      const [votesResult, participantsResult] = await Promise.all([
        db.execute({ sql: 'SELECT * FROM votes WHERE event_id = ?', args: [eventId] }),
        db.execute({ sql: 'SELECT id, name FROM participants WHERE event_id = ?', args: [eventId] }),
      ]);

      const participants = participantsResult.rows.map(r => ({ id: toStr(r.id), name: toStr(r.name) }));
      const votes = votesResult.rows.map(r => ({ participantId: toStr(r.participant_id), date: toStr(r.date) }));

      const votesByDate = {};
      for (const v of votes) {
        if (!votesByDate[v.date]) votesByDate[v.date] = { count: 0, voters: [] };
        votesByDate[v.date].count++;
        const p = participants.find(x => x.id === v.participantId);
        votesByDate[v.date].voters.push(p ? p.name : v.participantId);
      }

      // participantId → voted date map
      const myVotes = {};
      for (const v of votes) {
        myVotes[v.participantId] = v.date;
      }

      return res.json({ votesByDate, myVotes });
    }

    if (req.method === 'POST') {
      const { eventId, participantId, date } = req.body ?? {};
      console.log('[POST /api/votes]', { eventId, participantId, date });

      if (!eventId || !participantId || !date) {
        return res.status(400).json({ error: 'eventId, participantId, date 가 필요합니다.' });
      }

      const pCheck = await db.execute({
        sql: 'SELECT id FROM participants WHERE id = ? AND event_id = ?',
        args: [participantId, eventId],
      });
      if (pCheck.rows.length === 0) {
        return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' });
      }

      // upsert
      await db.execute({ sql: 'DELETE FROM votes WHERE event_id = ? AND participant_id = ?', args: [eventId, participantId] });
      await db.execute({
        sql: 'INSERT INTO votes (id, event_id, participant_id, date) VALUES (?, ?, ?, ?)',
        args: [nanoid(12), eventId, participantId, date],
      });

      console.log('[POST /api/votes] success');
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('[/api/votes] ERROR:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
