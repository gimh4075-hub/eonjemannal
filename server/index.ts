import express from 'express'
import cors from 'cors'
import eventsRouter from './routes/events'
import availabilityRouter from './routes/availability'
import { initSchema } from './db'

const app = express()
const PORT = 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json())

app.use('/api/events', eventsRouter)
app.use('/api/events', availabilityRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', mode: 'local-express' })
})

// DB 스키마 초기화 후 서버 시작
initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ 서버 실행 중: http://localhost:${PORT}`)
    })
  })
  .catch(err => {
    console.error('❌ DB 초기화 실패:', err)
    process.exit(1)
  })
