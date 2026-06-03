import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useEvent } from '../hooks/useEvent'
import VotingPanel from '../components/VotingPanel'
import { DateOverlap } from '../types'
import { useLang } from '../i18n'

function Spinner() {
  return (
    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  )
}

interface Toast {
  id: number
  message: string
  type: 'success' | 'error'
}

export default function Results() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { tr, locale } = useLang()

  const {
    event,
    availabilityResult,
    votesResult,
    localParticipant,
    loading,
    error,
    castVote,
    refetchVotes,
    refetchAvailability,
  } = useEvent(eventId)

  const [voting, setVoting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  // Poll votes every 10 seconds
  useEffect(() => {
    if (!eventId) return
    const interval = setInterval(() => {
      refetchVotes()
      refetchAvailability()
    }, 10000)
    return () => clearInterval(interval)
  }, [eventId, refetchVotes, refetchAvailability])

  function addToast(message: string, type: 'success' | 'error') {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  async function handleVote(date: string) {
    setVoting(true)
    try {
      await castVote(date)
      addToast('투표했어요! 🗳️', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : '투표 중 오류가 발생했습니다.', 'error')
    } finally {
      setVoting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Spinner />
          <span className="text-sm">{tr.loadingResults}</span>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">😢</div>
          <h2 className="text-lg font-bold text-slate-700 mb-2">{tr.notFound}</h2>
          <p className="text-sm text-slate-400 mb-5">{error}</p>
          <button onClick={() => navigate('/')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
            {tr.goHome}
          </button>
        </div>
      </div>
    )
  }

  const overlaps = availabilityResult?.overlaps ?? []
  const totalParticipants = availabilityResult?.totalParticipants ?? 0
  const perfectMatches = overlaps.filter(d => d.isPerfectMatch)
  const topDates = overlaps.slice(0, 5)
  const hasPerfectMatch = perfectMatches.length > 0

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Toast */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={[
              'px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto',
              t.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white',
            ].join(' ')}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => navigate(`/event/${eventId}`)}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            {tr.back}
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold text-slate-800 truncate">{event.title}</h1>
            <p className="text-xs text-slate-400">
              {tr.participating(totalParticipants)}
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="shrink-0 border border-slate-200 hover:bg-slate-50 text-slate-500 text-sm font-medium px-3 py-1.5 rounded-xl transition-colors"
          >
            {tr.newSchedule}
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
        {/* Perfect Match section */}
        {hasPerfectMatch && (
          <section className="bg-green-50 border border-green-200 rounded-2xl p-5">
            <h2 className="text-base font-bold text-green-800 mb-3 flex items-center gap-2">
              {tr.perfectMatch}
            </h2>
            <p className="text-sm text-green-700 mb-4">
              {tr.perfectMatchDesc(totalParticipants)}
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {perfectMatches.map(d => (
                <div
                  key={d.date}
                  className="bg-white border-2 border-green-400 rounded-xl px-4 py-3 flex items-center gap-3"
                >
                  <span className="text-2xl">✅</span>
                  <div>
                    <div className="font-bold text-green-700">
                      {format(parseISO(d.date), tr.dateFormatFull, { locale })}
                    </div>
                    <div className="text-xs text-green-600">{tr.availableCount(d.count, totalParticipants)}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Best Options section */}
        {topDates.length > 0 && (
          <section className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
            <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
              {tr.dateAvailability}
            </h2>
            {overlaps.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">
                {tr.noSubmissions}
              </p>
            ) : (
              <div className="space-y-3">
                {topDates.map((d, i) => (
                  <DateBar
                    key={d.date}
                    overlap={d}
                    totalParticipants={totalParticipants}
                    rank={i + 1}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Empty state */}
        {overlaps.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center text-slate-400">
            <div className="text-4xl mb-3">🙁</div>
            <p className="text-sm">{tr.empty}</p>
            <button onClick={() => navigate(`/event/${eventId}`)}
              className="mt-4 text-indigo-500 text-sm font-medium hover:underline">
              {tr.goBack}
            </button>
          </div>
        )}

        {/* Voting Panel */}
        {topDates.length > 0 && (
          <VotingPanel
            topDates={topDates}
            votesResult={votesResult}
            totalParticipants={totalParticipants}
            localParticipantId={localParticipant?.participantId}
            onVote={handleVote}
            voting={voting}
          />
        )}
      </main>
    </div>
  )
}

interface DateBarProps {
  overlap: DateOverlap
  totalParticipants: number
  rank: number
}

function DateBar({ overlap, totalParticipants, rank }: DateBarProps) {
  const { tr, locale } = useLang()
  const pct = totalParticipants > 0 ? Math.round((overlap.count / totalParticipants) * 100) : 0
  const isPerfect = overlap.isPerfectMatch

  return (
    <div
      className={[
        'rounded-xl p-3 border',
        isPerfect ? 'border-green-200 bg-green-50' : 'border-slate-100 bg-slate-50',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 w-4">#{rank}</span>
          <span className={`font-semibold text-sm ${isPerfect ? 'text-green-700' : 'text-slate-700'}`}>
            {format(parseISO(overlap.date), tr.dateFormat, { locale })}
          </span>
          {isPerfect && <span className="text-xs bg-green-200 text-green-700 px-1.5 py-0.5 rounded-full font-medium">{tr.allAvailable}</span>}
        </div>
        <span className="text-sm font-semibold text-slate-600">
          {overlap.count}/{totalParticipants} ({pct}%)
        </span>
      </div>

      {/* Bar */}
      <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${isPerfect ? 'bg-green-500' : 'bg-indigo-400'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Participant names */}
      <div className="flex flex-wrap gap-1">
        {overlap.participants.map(name => (
          <span
            key={name}
            className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full"
          >
            {name}
          </span>
        ))}
      </div>
    </div>
  )
}
