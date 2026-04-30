import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CreateEvent from './pages/CreateEvent'
import EventRoom from './pages/EventRoom'
import Results from './pages/Results'
import MyEvents from './pages/MyEvents'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateEvent />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/event/:eventId" element={<EventRoom />} />
        <Route path="/event/:eventId/results" element={<Results />} />
      </Routes>
    </BrowserRouter>
  )
}
