import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import db from '../db';
import { Participant, Availability, Vote } from '../types';

const router = Router();

// POST /api/events/:eventId/join — Join as participant
router.post('/:eventId/join', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: '이름을 입력해주세요.' });
    }

    const event = db.prepare('SELECT id FROM events WHERE id = ?').get(eventId);
    if (!event) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }

    const participantId = nanoid(12);
    db.prepare(`
      INSERT INTO participants (id, event_id, name, joined_at)
      VALUES (?, ?, ?, ?)
    `).run(participantId, eventId, name.trim(), Date.now());

    return res.json({ participantId, name: name.trim() });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '참여 중 오류가 발생했습니다.' });
  }
});

// POST /api/events/:eventId/availability — Submit available dates
router.post('/:eventId/availability', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { participantId, dates } = req.body;

    if (!participantId || !Array.isArray(dates)) {
      return res.status(400).json({ error: '잘못된 요청입니다.' });
    }

    const participant = db.prepare(
      'SELECT id FROM participants WHERE id = ? AND event_id = ?'
    ).get(participantId, eventId);
    if (!participant) {
      return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' });
    }

    // Delete existing availability for this participant then re-insert
    db.prepare('DELETE FROM availability WHERE participant_id = ? AND event_id = ?')
      .run(participantId, eventId);

    const insert = db.prepare(`
      INSERT INTO availability (id, participant_id, event_id, date)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = db.transaction((dateList: string[]) => {
      for (const date of dateList) {
        insert.run(nanoid(12), participantId, eventId, date);
      }
    });
    insertMany(dates);

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '가용 날짜 저장 중 오류가 발생했습니다.' });
  }
});

// GET /api/events/:eventId/availability — Get all availability + overlaps
router.get('/:eventId/availability', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = db.prepare(
      'SELECT date_range_start, date_range_end FROM events WHERE id = ?'
    ).get(eventId) as { date_range_start: string; date_range_end: string } | undefined;

    if (!event) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }

    const participants = db.prepare(
      'SELECT * FROM participants WHERE event_id = ? ORDER BY joined_at ASC'
    ).all(eventId) as Participant[];

    const allAvailability = db.prepare(
      'SELECT * FROM availability WHERE event_id = ?'
    ).all(eventId) as Availability[];

    // Build availability map: date -> [participantId, ...]
    const dateToParticipants: Record<string, string[]> = {};
    for (const row of allAvailability) {
      if (!dateToParticipants[row.date]) dateToParticipants[row.date] = [];
      dateToParticipants[row.date].push(row.participant_id);
    }

    // Build participant-keyed availability map for grid
    const availability: Record<string, string[]> = {};
    for (const p of participants) {
      availability[p.id] = allAvailability
        .filter(a => a.participant_id === p.id)
        .map(a => a.date);
    }

    const totalParticipants = participants.length;

    // Build overlaps sorted by count desc
    const overlaps = Object.entries(dateToParticipants)
      .map(([date, pIds]) => ({
        date,
        count: pIds.length,
        participants: pIds.map(pid => {
          const p = participants.find(x => x.id === pid);
          return p ? p.name : pid;
        }),
        isPerfectMatch: pIds.length === totalParticipants && totalParticipants > 0,
      }))
      .sort((a, b) => b.count - a.count);

    return res.json({ participants, availability, overlaps, totalParticipants });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '가용 날짜 조회 중 오류가 발생했습니다.' });
  }
});

// POST /api/events/:eventId/vote — Cast or change a vote
router.post('/:eventId/vote', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;
    const { participantId, date } = req.body;

    if (!participantId || !date) {
      return res.status(400).json({ error: '잘못된 요청입니다.' });
    }

    const participant = db.prepare(
      'SELECT id FROM participants WHERE id = ? AND event_id = ?'
    ).get(participantId, eventId);
    if (!participant) {
      return res.status(404).json({ error: '참여자를 찾을 수 없습니다.' });
    }

    // Upsert: delete old vote then insert new
    db.prepare('DELETE FROM votes WHERE event_id = ? AND participant_id = ?')
      .run(eventId, participantId);
    db.prepare(`
      INSERT INTO votes (id, event_id, participant_id, date) VALUES (?, ?, ?, ?)
    `).run(nanoid(12), eventId, participantId, date);

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '투표 중 오류가 발생했습니다.' });
  }
});

// GET /api/events/:eventId/votes — Get vote counts per date
router.get('/:eventId/votes', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const votes = db.prepare('SELECT * FROM votes WHERE event_id = ?').all(eventId) as Vote[];
    const participants = db.prepare(
      'SELECT * FROM participants WHERE event_id = ?'
    ).all(eventId) as Participant[];

    // Group votes by date
    const votesByDate: Record<string, { count: number; voters: string[] }> = {};
    for (const v of votes) {
      if (!votesByDate[v.date]) votesByDate[v.date] = { count: 0, voters: [] };
      votesByDate[v.date].count++;
      const p = participants.find(x => x.id === v.participant_id);
      votesByDate[v.date].voters.push(p ? p.name : v.participant_id);
    }

    // Map of participantId -> voted date
    const myVotes: Record<string, string> = {};
    for (const v of votes) {
      myVotes[v.participant_id] = v.date;
    }

    return res.json({ votesByDate, myVotes });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '투표 결과 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
