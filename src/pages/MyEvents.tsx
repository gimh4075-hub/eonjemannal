import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { getHostedEvents, removeHostedEvent } from '../utils/storage'
import { useLang } from '../i18n'

export default function MyEvents() {
  const navigate = useNavigate()
  const { tr, locale } = useLang()
  const [events, setEvents] = useState(() => getHostedEvents())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(eventId: string) {
    setDeletingId(eventId)
    try {
      const res = await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || tr.delete)
      }
      removeHostedEvent(eventId)
      setEvents(getHostedEvents())
    } catch (err) {
      alert(err instanceof Error ? err.message : tr.delete)
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/')} className="text-slate-400 hover:text-slate-600 transition-colors">
            {tr.back}
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{tr.myEventsTitle}</h1>
            <p className="text-sm text-slate-400 mt-0.5">{tr.myEventsDesc}</p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500 font-medium mb-1">{tr.noHostedEvents}</p>
            <p className="text-sm text-slate-400 mb-5">{tr.noHostedEventsDesc}</p>
            <button onClick={() => navigate('/')}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
              {tr.createEventBtn}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <div key={ev.eventId} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
                <button className="flex-1 text-left min-w-0" onClick={() => navigate(`/event/${ev.eventId}`)}>
                  <p className="font-semibold text-slate-800 truncate">{ev.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {tr.createdAt(format(new Date(ev.createdAt), 'yyyy-MM-dd', { locale }))}
                  </p>
                </button>

                {confirmId === ev.eventId ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setConfirmId(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg border border-slate-200 transition-colors">
                      {tr.cancel}
                    </button>
                    <button onClick={() => handleDelete(ev.eventId)} disabled={deletingId === ev.eventId}
                      className="text-xs bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold px-3 py-1 rounded-lg transition-colors">
                      {deletingId === ev.eventId ? tr.deleting : tr.deleteConfirm}
                    </button>
                  </div>
                ) : (
                  <button onClick={() => setConfirmId(ev.eventId)}
                    className="shrink-0 text-xs text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors">
                    {tr.delete}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
