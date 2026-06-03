import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { LangProvider } from './i18n'
import LanguageSwitcher from './components/LanguageSwitcher'
import CreateEvent from './pages/CreateEvent'
import EventRoom from './pages/EventRoom'
import Results from './pages/Results'
import MyEvents from './pages/MyEvents'
import Admin from './pages/Admin'
import FeedbackButton from './components/FeedbackButton'

export default function App() {
  return (
    <LangProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateEvent />} />
        <Route path="/my-events" element={<MyEvents />} />
        <Route path="/event/:eventId" element={<EventRoom />} />
        <Route path="/event/:eventId/results" element={<Results />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <FeedbackButton />
      <LanguageSwitcher />
      <Analytics />
    </BrowserRouter>
    </LangProvider>
  )
}
