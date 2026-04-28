import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format, addDays } from 'date-fns'

function storeParticipant(eventId: string, info: { participantId: string; name: string }) {
  try {
    const raw = localStorage.getItem('eonjemannal_participants')
    const map = raw ? JSON.parse(raw) : {}
    map[eventId] = info
    localStorage.setItem('eonjemannal_participants', JSON.stringify(map))
  } catch {
    // ignore
  }
}

export default function CreateEvent() {
  const navigate = useNavigate()
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

    if (!title.trim() || !hostName.trim()) {
      setError('이벤트 제목과 주최자 이름을 입력해주세요.')
      return
    }
    if (!dateRangeStart || !dateRangeEnd) {
      setError('날짜 범위를 선택해주세요.')
      return
    }
    if (dateRangeEnd < dateRangeStart) {
      setError('종료일은 시작일 이후여야 합니다.')
      return
    }

    const diff =
      (new Date(dateRangeEnd).getTime() - new Date(dateRangeStart).getTime()) /
      (1000 * 60 * 60 * 24)
    if (diff > 60) {
      setError('날짜 범위는 최대 60일까지 설정할 수 있습니다.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, hostName, dateRangeStart, dateRangeEnd }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '이벤트 생성에 실패했습니다.')

      const { eventId, participantId } = data
      storeParticipant(eventId, { participantId, name: hostName })

      const link = `${window.location.origin}/event/${eventId}`
      setCreatedLink(link)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
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
    } catch {
      // fallback
    }
  }

  function handleGoToEvent() {
    if (!createdLink) return
    const eventId = createdLink.split('/event/')[1]
    navigate(`/event/${eventId}`)
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-indigo-500 rounded-2xl mb-3 shadow-lg">
            <span className="text-2xl">📅</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">언제만날까</h1>
          <p className="text-slate-400 text-sm mt-1">모두가 가능한 날을 쉽게 찾아보세요</p>
        </div>

        {!createdLink ? (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                이벤트 제목 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="예: 팀 회식 날짜 정하기"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                설명 <span className="text-slate-400 font-normal">(선택)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="추가 안내사항을 입력하세요"
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                주최자 이름 <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={hostName}
                onChange={e => setHostName(e.target.value)}
                placeholder="예: 김철수"
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                날짜 범위 선택 <span className="text-red-400">*</span>
                <span className="text-slate-400 font-normal ml-1">(최대 60일)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateRangeStart}
                  min={today}
                  onChange={e => setDateRangeStart(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                />
                <span className="text-slate-400">~</span>
                <input
                  type="date"
                  value={dateRangeEnd}
                  min={dateRangeStart}
                  onChange={e => setDateRangeEnd(e.target.value)}
                  className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-transparent transition"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner />
                  이벤트 생성 중...
                </>
              ) : (
                '이벤트 만들기'
              )}
            </button>
          </form>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-5">
            <div className="text-center">
              <div className="text-4xl mb-2">🎉</div>
              <h2 className="text-lg font-bold text-slate-800">이벤트가 생성됐어요!</h2>
              <p className="text-sm text-slate-400 mt-1">아래 링크를 참여자들에게 공유하세요</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center gap-2">
              <span className="text-sm text-slate-600 truncate flex-1 font-mono">{createdLink}</span>
              <button
                onClick={handleCopy}
                className="shrink-0 px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {copied ? '✓ 복사됨' : '복사'}
              </button>
            </div>

            <button
              onClick={handleGoToEvent}
              className="w-full bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              이벤트 방으로 이동 →
            </button>

            <button
              onClick={() => {
                setCreatedLink(null)
                setTitle('')
                setDescription('')
                setHostName('')
                setDateRangeStart(today)
                setDateRangeEnd(defaultEnd)
              }}
              className="w-full border border-slate-200 text-slate-500 hover:bg-slate-50 font-medium py-2.5 rounded-xl transition-colors text-sm"
            >
              새 이벤트 만들기
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
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  )
}
