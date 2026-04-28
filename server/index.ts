import express from 'express';
import cors from 'cors';
import eventsRouter from './routes/events';
import availabilityRouter from './routes/availability';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/events', eventsRouter);
app.use('/api/events', availabilityRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`✅ 서버 실행 중: http://localhost:${PORT}`);
});
