import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { useEvent } from '../hooks/useEvent'
import Calendar from '../components/Calendar'
import ParticipantList from '../components/ParticipantList'
import AvailabilityGrid from '../components/AvailabilityGrid'
import { getHostedEvents, addHostedEvent, removeStoredParticipant } from '../utils/storage'
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

export default function EventRoom() {
  const { eventId } = useParams<{ eventId: string }>()
  const navigate = useNavigate()
  const { tr, locale } = useLang()

  const {
    event,
    participants,
    availabilityResult,
    localParticipant,
    loading,
    error,
    joinEvent,
    renameParticipant,
    leaveEvent,
    submitAvailability,
    updateEvent,
    refetchAvailability,
  } = useEvent(eventId)

  const [showJoinModal, setShowJoinModal] = useState(false)
  const [joinName, setJoinName] = useState('')
  const [joinLoading, setJoinLoading] = useState(false)
  const [joinError, setJoinError] = useState<string | null>(null)

  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(0)

  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [leaveLoading, setLeaveLoading] = useState(false)

  const [showRenameModal, setShowRenameModal] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [renameLoading, setRenameLoading] = useState(false)
  const [renameError, setRenameError] = useState<string | null>(null)

  const [showEditModal, setShowEditModal] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editStart, setEditStart] = useState('')
  const [editEnd, setEditEnd] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Show join modal if no local participant
  useEffect(() => {
    if (!loading && event && !localParticipant) {
      setShowJoinModal(true)
    }
  }, [loading, event, localParticipant])

  // Pre-fill selected dates from existing availability
  useEffect(() => {
    if (localParticipant && availabilityResult) {
      const myDates = availabilityResult.availability[localParticipant.participantId] ?? []
      setSelectedDates(myDates)
    }
  }, [localParticipant, availabilityResult])

  // Poll every 15 seconds
  useEffect(() => {
    if (!eventId) return
    const interval = setInterval(() => {
      refetchAvailability()
    }, 15000)
    return () => clearInterval(interval)
  }, [eventId, refetchAvailability])

  function addToast(message: string, type: 'success' | 'error') {
    const id = ++toastId.current
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000)
  }

  function toggleDate(date: string) {
    setSelectedDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    )
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    if (!joinName.trim()) {
      setJoinError(tr.errName)
      return
    }
    setJoinLoading(true)
    setJoinError(null)
    try {
      await joinEvent(joinName.trim())
      setShowJoinModal(false)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : tr.checkLink)
    } finally {
      setJoinLoading(false)
    }
  }

  const isHost = !!event && !!localParticipant && localParticipant.name === event.hostName

  function openRenameModal() {
    setRenameValue(localParticipant?.name ?? '')
    setRenameError(null)
    setShowRenameModal(true)
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault()
    if (!renameValue.trim()) { setRenameError(tr.errName); return }
    if (renameValue.trim() === localParticipant?.name) { setShowRenameModal(false); return }
    setRenameLoading(true)
    setRenameError(null)
    try {
      await renameParticipant(renameValue.trim())
      setShowRenameModal(false)
      addToast(tr.toastRenamed, 'success')
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : tr.checkLink)
    } finally {
      setRenameLoading(false)
    }
  }

  async function handleLeave() {
    setLeaveLoading(true)
    try {
      await leaveEvent()
      if (eventId) removeStoredParticipant(eventId)
      setShowLeaveConfirm(false)
      // 참여자 정보 초기화 → join 모달이 다시 뜸
      window.location.reload()
    } catch (err) {
      addToast(err instanceof Error ? err.message : tr.checkLink, 'error')
      setShowLeaveConfirm(false)
    } finally {
      setLeaveLoading(false)
    }
  }

  function openEditModal() {
    if (!event) return
    setEditTitle(event.title)
    setEditDescription(event.description ?? '')
    setEditStart(event.dateRangeStart)
    setEditEnd(event.dateRangeEnd)
    setEditError(null)
    setShowEditModal(true)
  }

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    setEditError(null)
    if (!editTitle.trim()) { setEditError(tr.errTitleHost); return }
    if (!editStart || !editEnd) { setEditError(tr.errDateRange); return }
    if (editEnd < editStart) { setEditError(tr.errEndDate); return }
    const diff = (new Date(editEnd).getTime() - new Date(editStart).getTime()) / (1000 * 60 * 60 * 24)
    if (diff > 60) { setEditError(tr.errMaxDays); return }

    setEditLoading(true)
    try {
      await updateEvent({ title: editTitle.trim(), description: editDescription.trim(), dateRangeStart: editStart, dateRangeEnd: editEnd })
      // sync title in localStorage hosted list
      if (eventId) {
        const hosted = getHostedEvents()
        if (hosted.some(h => h.eventId === eventId)) {
          addHostedEvent({ eventId, title: editTitle.trim(), createdAt: hosted.find(h => h.eventId === eventId)?.createdAt ?? Date.now() })
        }
      }
      setShowEditModal(false)
      addToast(tr.toastEdited, 'success')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : tr.checkLink)
    } finally {
      setEditLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await submitAvailability(selectedDates)
      addToast(tr.toastSaved, 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : tr.checkLink, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Spinner />
          <span className="text-sm">{tr.loading}</span>
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
          <p className="text-sm text-slate-400 mb-5">{error || tr.checkLink}</p>
          <button onClick={() => navigate('/')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            {tr.goHome}
          </button>
        </div>
      </div>
    )
  }

  const shareUrl = `${window.location.origin}/event/${eventId}`

  return (
    <div className="min-h-screen bg-slate-50 pb-16">
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className={[
              'px-4 py-3 rounded-xl shadow-lg text-sm font-medium pointer-events-auto',
              t.type === 'success'
                ? 'bg-green-500 text-white'
                : 'bg-red-500 text-white',
            ].join(' ')}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Join modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-1">{tr.join}</h2>
            <p className="text-sm text-slate-400 mb-4">
              <span className="font-medium text-indigo-500">"{event.title}"</span>{tr.joinDesc}
            </p>
            <form onSubmit={handleJoin} className="space-y-3">
              <input type="text" value={joinName} onChange={e => setJoinName(e.target.value)}
                placeholder={tr.namePlaceholder} autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
              {joinError && <p className="text-red-500 text-xs">{joinError}</p>}
              <button type="submit" disabled={joinLoading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                {joinLoading ? <><Spinner />{tr.joining}</> : tr.join}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Rename modal */}
      {showRenameModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-1">{tr.rename}</h2>
            <p className="text-sm text-slate-400 mb-4">{tr.renameDesc}</p>
            <form onSubmit={handleRename} className="space-y-3">
              <input type="text" value={renameValue} onChange={e => setRenameValue(e.target.value)}
                placeholder={tr.newNamePlaceholder} autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
              {renameError && <p className="text-red-500 text-xs">{renameError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowRenameModal(false)}
                  className="flex-1 border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition-colors text-sm">
                  {tr.cancel}
                </button>
                <button type="submit" disabled={renameLoading}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {renameLoading ? <><Spinner />{tr.renaming}</> : tr.doRename}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leave confirm modal */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="text-center mb-5">
              <div className="text-4xl mb-3">🚪</div>
              <h2 className="text-lg font-bold text-slate-800 mb-2">{tr.leaveTitle}</h2>
              <p className="text-sm text-slate-500">{tr.leaveDesc}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowLeaveConfirm(false)} disabled={leaveLoading}
                className="flex-1 border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition-colors text-sm">
                {tr.cancel}
              </button>
              <button onClick={handleLeave} disabled={leaveLoading}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                {leaveLoading ? <><Spinner />{tr.leaving}</> : tr.leave}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-800 mb-4">{tr.editEvent}</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {tr.eventTitle} <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {tr.description} <span className="text-slate-400 font-normal">{tr.optional}</span>
                </label>
                <textarea
                  value={editDescription}
                  onChange={e => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  {tr.dateRange} <span className="text-red-400">*</span>
                  <span className="text-slate-400 font-normal ml-1">{tr.dateRangeLimit}</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={editStart}
                    onChange={e => setEditStart(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                  />
                  <span className="text-slate-400">~</span>
                  <input
                    type="date"
                    value={editEnd}
                    min={editStart}
                    onChange={e => setEditEnd(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                  />
                </div>
              </div>
              {editError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                  {editError}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition-colors text-sm"
                >
                  {tr.cancel}
                </button>
                <button type="submit" disabled={editLoading}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
                  {editLoading ? <><Spinner />{tr.saving}</> : tr.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-800 truncate">{event.title}</h1>
            <p className="text-xs text-slate-400">
              {format(parseISO(event.dateRangeStart), tr.shortDateFormat, { locale })} ~{' '}
              {format(parseISO(event.dateRangeEnd), tr.shortDateFormat, { locale })}
              &nbsp;·&nbsp;{tr.host}: {event.hostName}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => navigate('/')}
              className="border border-slate-200 hover:bg-slate-50 text-slate-500 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            >
              🏠
            </button>
            {isHost && (
              <button
                onClick={openEditModal}
                className="border border-slate-200 hover:bg-slate-50 text-slate-500 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              >
                {tr.edit}
              </button>
            )}
            {localParticipant && (
              <button
                onClick={openRenameModal}
                className="border border-slate-200 hover:bg-slate-50 text-slate-500 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              >
                👤 {localParticipant.name}
              </button>
            )}
            {localParticipant && !isHost && (
              <button
                onClick={() => setShowLeaveConfirm(true)}
                className="border border-red-200 hover:bg-red-50 text-red-400 hover:text-red-500 text-sm font-medium px-3 py-2 rounded-xl transition-colors"
              >
                {tr.leave}
              </button>
            )}
            <button
              onClick={() => navigate(`/event/${eventId}/results`)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              {tr.viewResults}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-6 gap-6 grid lg:grid-cols-[1fr_340px]">
        {/* Left: Calendar */}
        <div className="space-y-4">
          {event.description && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 text-sm text-indigo-700">
              {event.description}
            </div>
          )}

          <Calendar
            rangeStart={event.dateRangeStart}
            rangeEnd={event.dateRangeEnd}
            selectedDates={selectedDates}
            onToggleDate={toggleDate}
            overlaps={availabilityResult?.overlaps}
            totalParticipants={availabilityResult?.totalParticipants ?? 0}
          />

          {/* Save button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !localParticipant}
              className="flex-1 bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <><Spinner />{tr.saving}</> : tr.saveBtn(selectedDates.length)}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl).catch(() => {})
                addToast(tr.toastLinkCopied, 'success')
              }}
              className="shrink-0 border border-slate-200 hover:bg-slate-50 text-slate-500 text-sm font-medium px-4 py-3 rounded-xl transition-colors"
            >
              {tr.copyLink}
            </button>
          </div>
        </div>

        {/* Right: Participant list + Availability grid */}
        <div className="space-y-4">
          <ParticipantList
            participants={participants}
            localParticipantId={localParticipant?.participantId}
            availabilityMap={availabilityResult?.availability}
          />

          {availabilityResult && (
            <AvailabilityGrid
              result={availabilityResult}
              rangeStart={event.dateRangeStart}
              rangeEnd={event.dateRangeEnd}
            />
          )}
        </div>
      </main>
    </div>
  )
}
