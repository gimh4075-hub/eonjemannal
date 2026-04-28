import { Router, Request, Response } from 'express';
import { nanoid } from 'nanoid';
import db from '../db';
import { Event, Participant } from '../types';

const router = Router();

// POST /api/events — Create a new event
router.post('/', (req: Request, res: Response) => {
  try {
    const { title, description, hostName, dateRangeStart, dateRangeEnd } = req.body;

    if (!title || !hostName || !dateRangeStart || !dateRangeEnd) {
      return res.status(400).json({ error: '필수 항목이 누락되었습니다.' });
    }

    const start = new Date(dateRangeStart);
    const end = new Date(dateRangeEnd);
    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 60) {
      return res.status(400).json({ error: '날짜 범위는 최대 60일까지 선택할 수 있습니다.' });
    }
    if (diffDays < 0) {
      return res.status(400).json({ error: '종료일은 시작일 이후여야 합니다.' });
    }

    const eventId = nanoid(8);
    const now = Date.now();

    db.prepare(`
      INSERT INTO events (id, title, description, host_name, date_range_start, date_range_end, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(eventId, title, description || null, hostName, dateRangeStart, dateRangeEnd, now);

    // Auto-join host as a participant
    const participantId = nanoid(12);
    db.prepare(`
      INSERT INTO participants (id, event_id, name, joined_at)
      VALUES (?, ?, ?, ?)
    `).run(participantId, eventId, hostName, now);

    return res.json({
      eventId,
      participantId,
      shareUrl: `/event/${eventId}`,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '이벤트 생성 중 오류가 발생했습니다.' });
  }
});

// GET /api/events/:eventId — Get event details + participants
router.get('/:eventId', (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const event = db.prepare('SELECT * FROM events WHERE id = ?').get(eventId) as Event | undefined;
    if (!event) {
      return res.status(404).json({ error: '이벤트를 찾을 수 없습니다.' });
    }

    const participants = db.prepare(
      'SELECT * FROM participants WHERE event_id = ? ORDER BY joined_at ASC'
    ).all(eventId) as Participant[];

    return res.json({ event, participants });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: '이벤트 조회 중 오류가 발생했습니다.' });
  }
});

export default router;
