import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useEvent } from '../hooks/useEvent'
import Calendar from '../components/Calendar'
import ParticipantList from '../components/ParticipantList'
import AvailabilityGrid from '../components/AvailabilityGrid'
import { getHostedEvents, addHostedEvent } from '../utils/storage'

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

  const {
    event,
    participants,
    availabilityResult,
    localParticipant,
    loading,
    error,
    joinEvent,
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
      setJoinError('이름을 입력해주세요.')
      return
    }
    setJoinLoading(true)
    setJoinError(null)
    try {
      await joinEvent(joinName.trim())
      setShowJoinModal(false)
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setJoinLoading(false)
    }
  }

  const isHost = !!event && !!localParticipant && localParticipant.name === event.hostName

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
    if (!editTitle.trim()) { setEditError('이벤트 제목을 입력해주세요.'); return }
    if (!editStart || !editEnd) { setEditError('날짜 범위를 선택해주세요.'); return }
    if (editEnd < editStart) { setEditError('종료일은 시작일 이후여야 합니다.'); return }
    const diff = (new Date(editEnd).getTime() - new Date(editStart).getTime()) / (1000 * 60 * 60 * 24)
    if (diff > 60) { setEditError('날짜 범위는 최대 60일까지 설정할 수 있습니다.'); return }

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
      addToast('이벤트가 수정됐어요! ✓', 'success')
    } catch (err) {
      setEditError(err instanceof Error ? err.message : '수정 중 오류가 발생했습니다.')
    } finally {
      setEditLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      await submitAvailability(selectedDates)
      addToast('가능한 날짜가 저장됐어요! ✓', 'success')
    } catch (err) {
      addToast(err instanceof Error ? err.message : '저장 중 오류가 발생했습니다.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Spinner />
          <span className="text-sm">불러오는 중...</span>
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 text-center max-w-sm">
          <div className="text-4xl mb-3">😢</div>
          <h2 className="text-lg font-bold text-slate-700 mb-2">이벤트를 찾을 수 없어요</h2>
          <p className="text-sm text-slate-400 mb-5">{error || '링크를 다시 확인해주세요.'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            홈으로 가기
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
            <h2 className="text-lg font-bold text-slate-800 mb-1">참여하기</h2>
            <p className="text-sm text-slate-400 mb-4">
              <span className="font-medium text-indigo-500">"{event.title}"</span> 에 참여합니다.
              이름을 입력해주세요.
            </p>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
                placeholder="이름 입력"
                autoFocus
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
              />
              {joinError && (
                <p className="text-red-500 text-xs">{joinError}</p>
              )}
              <button
                type="submit"
                disabled={joinLoading}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {joinLoading ? <><Spinner /> 참여 중...</> : '참여하기'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-bold text-slate-800 mb-4">이벤트 수정</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  이벤트 제목 <span className="text-red-400">*</span>
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
                  설명 <span className="text-slate-400 font-normal">(선택)</span>
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
                  날짜 범위 <span className="text-red-400">*</span>
                  <span className="text-slate-400 font-normal ml-1">(최대 60일)</span>
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
                  취소
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {editLoading ? <><Spinner />저장 중...</> : '저장하기'}
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
              {format(parseISO(event.dateRangeStart), 'M월 d일', { locale: ko })} ~{' '}
              {format(parseISO(event.dateRangeEnd), 'M월 d일', { locale: ko })}
              &nbsp;·&nbsp;주최자: {event.hostName}
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
                ✏️ 수정
              </button>
            )}
            <button
              onClick={() => navigate(`/event/${eventId}/results`)}
              className="bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
            >
              결과 보기
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
              {saving ? <><Spinner />저장 중...</> : `저장하기 (${selectedDates.length}일 선택)`}
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(shareUrl).catch(() => {})
                addToast('링크가 복사됐어요!', 'success')
              }}
              className="shrink-0 border border-slate-200 hover:bg-slate-50 text-slate-500 text-sm font-medium px-4 py-3 rounded-xl transition-colors"
            >
              링크 복사
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
