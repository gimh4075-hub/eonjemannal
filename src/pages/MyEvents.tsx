import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { getHostedEvents, removeHostedEvent } from '../utils/storage'

export default function MyEvents() {
  const navigate = useNavigate()
  const [events, setEvents] = useState(() => getHostedEvents())
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  async function handleDelete(eventId: string) {
    setDeletingId(eventId)
    try {
      const res = await fetch(`/api/events?id=${eventId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '삭제에 실패했습니다.')
      }
      removeHostedEvent(eventId)
      setEvents(getHostedEvents())
    } catch (err) {
      alert(err instanceof Error ? err.message : '삭제 중 오류가 발생했습니다.')
    } finally {
      setDeletingId(null)
      setConfirmId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← 뒤로
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">내가 만든 이벤트</h1>
            <p className="text-sm text-slate-400 mt-0.5">주최한 이벤트 목록이에요</p>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-500 font-medium mb-1">아직 만든 이벤트가 없어요</p>
            <p className="text-sm text-slate-400 mb-5">새 이벤트를 만들어 일정을 잡아보세요!</p>
            <button
              onClick={() => navigate('/')}
              className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
            >
              이벤트 만들기
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(ev => (
              <div
                key={ev.eventId}
                className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-3"
              >
                {/* Click area → navigate */}
                <button
                  className="flex-1 text-left min-w-0"
                  onClick={() => navigate(`/event/${ev.eventId}`)}
                >
                  <p className="font-semibold text-slate-800 truncate">{ev.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {format(new Date(ev.createdAt), 'yyyy년 M월 d일 만들어짐', { locale: ko })}
                  </p>
                </button>

                {/* Delete */}
                {confirmId === ev.eventId ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => setConfirmId(null)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded-lg border border-slate-200 transition-colors"
                    >
                      취소
                    </button>
                    <button
                      onClick={() => handleDelete(ev.eventId)}
                      disabled={deletingId === ev.eventId}
                      className="text-xs bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-semibold px-3 py-1 rounded-lg transition-colors"
                    >
                      {deletingId === ev.eventId ? '삭제 중...' : '삭제 확인'}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmId(ev.eventId)}
                    className="shrink-0 text-xs text-slate-400 hover:text-red-500 border border-slate-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    삭제
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
