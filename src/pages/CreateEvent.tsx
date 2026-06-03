import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addDays } from 'date-fns'
import { addHostedEvent, storeParticipant } from '../utils/storage'
import NoticeBanner from '../components/NoticeBanner'
import { useLang } from '../i18n'

export default function CreateEvent() {
  const navigate = useNavigate()
  const { tr } = useLang()
  const today = format(new Date(), 'yyyy-MM-dd')
  const defaultEnd = format(addDays(new Date(), 14), 'yyyy-MM-dd')

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [hostName, setHostName] = useState('')
  const [dateRangeStart, setDateRangeStart] = useState(today)
  const [dateRangeEnd, setDateRangeEnd] = useState(defaultEnd)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdLink, setCreatedLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!title.trim() || !hostName.trim()) { setError(tr.errTitleHost); return }
    if (!dateRangeStart || !dateRangeEnd) { setError(tr.errDateRange); return }
    if (dateRangeEnd < dateRangeStart) { setError(tr.errEndDate); return }
    const diff = (new Date(dateRangeEnd).getTime() - new Date(dateRangeStart).getTime()) / (1000 * 60 * 60 * 24)
    if (diff > 60) { setError(tr.errMaxDays); return }

    setLoading(true)
    try {
      const evRes = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, hostName, dateRangeStart, dateRangeEnd }),
      })
      const evData = await evRes.json()
      if (!evRes.ok) throw new Error(evData.error || tr.createEvent)

      const eventId: string = evData.id
      const joinRes = await fetch('/api/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, name: hostName }),
      })
      const joinData = await joinRes.json()
      if (!joinRes.ok) throw new Error(joinData.error || tr.joining)

      storeParticipant(eventId, { participantId: joinData.participantId, name: joinData.name })
      addHostedEvent({ eventId, title, createdAt: Date.now() })
      setCreatedLink(`${window.location.origin}/event/${eventId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.errTitleHost)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!createdLink) return
    try {
      await navigator.clipboard.writeText(createdLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <NoticeBanner />

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500 rounded-2xl mb-3 shadow-lg">
            <span className="text-2xl">📅</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">{tr.appName}</h1>
          <p className="text-slate-400 text-sm mt-1">{tr.appTagline}</p>
          <button
            onClick={() => navigate('/my-events')}
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
          >
            {tr.myEvents}
          </button>
        </div>

        {!createdLink ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {tr.eventTitle} <span className="text-red-400">*</span>
              </label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                placeholder={tr.eventTitlePlaceholder}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {tr.description} <span className="text-slate-400 font-normal">{tr.optional}</span>
              </label>
              <textarea value={description} onChange={e => setDescription(e.target.value)}
                placeholder={tr.descriptionPlaceholder} rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition resize-none" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {tr.hostName} <span className="text-red-400">*</span>
              </label>
              <input type="text" value={hostName} onChange={e => setHostName(e.target.value)}
                placeholder={tr.hostNamePlaceholder}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition" />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                {tr.dateRange} <span className="text-red-400">*</span>
                <span className="text-slate-400 font-normal ml-1">{tr.dateRangeLimit}</span>
              </label>
              <div className="flex items-center gap-2">
                <input type="date" value={dateRangeStart} min={today} onChange={e => setDateRangeStart(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition" />
                <span className="text-slate-400">~</span>
                <input type="date" value={dateRangeEnd} min={dateRangeStart} onChange={e => setDateRangeEnd(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition" />
              </div>
            </div>

            {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}

            <button type="submit" disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              {loading ? <><Spinner />{tr.creating}</> : tr.createEvent}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-lg font-bold text-slate-800">{tr.eventCreated}</h2>
              <p className="text-sm text-slate-400 mt-1">{tr.shareLink}</p>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
              <span className="text-sm text-slate-600 truncate flex-1 font-mono">{createdLink}</span>
              <button onClick={handleCopy}
                className="shrink-0 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors">
                {copied ? tr.copied : tr.copy}
              </button>
            </div>
            <button onClick={() => { const id = createdLink!.split('/event/')[1]; navigate(`/event/${id}`) }}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition-colors">
              {tr.goToEvent}
            </button>
            <button onClick={() => { setCreatedLink(null); setTitle(''); setDescription(''); setHostName(''); setDateRangeStart(today); setDateRangeEnd(defaultEnd) }}
              className="w-full border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition-colors text-sm">
              {tr.newEvent}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}
