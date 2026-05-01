import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface FeedbackItem {
  id: string
  category: string
  message: string
  contact: string
  createdAt: number
  date: string
}

const CATEGORY_META: Record<string, { label: string; color: string }> = {
  bug:        { label: '🐛 버그 신고',  color: 'bg-red-100 text-red-700' },
  suggestion: { label: '💡 기능 제안',  color: 'bg-yellow-100 text-yellow-700' },
  compliment: { label: '🙌 칭찬해요',   color: 'bg-green-100 text-green-700' },
  general:    { label: '💬 기타 의견',  color: 'bg-slate-100 text-slate-600' },
}

export default function FeedbackAdmin() {
  const [secret, setSecret] = useState('')
  const [list, setList] = useState<FeedbackItem[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLoad(e: React.FormEvent) {
    e.preventDefault()
    if (!secret.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/feedback?secret=${encodeURIComponent(secret.trim())}`)
      if (res.status === 401) throw new Error('비밀번호가 틀렸어요.')
      if (!res.ok) throw new Error('불러오기에 실패했습니다.')
      const data = await res.json()
      setList(data.feedback)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const counts = list
    ? Object.fromEntries(
        ['bug', 'suggestion', 'compliment', 'general'].map(c => [
          c,
          list.filter(f => f.category === c).length,
        ])
      )
    : null

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-2xl mb-3 shadow-md">
            <span className="text-xl">📬</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">피드백 관리</h1>
          <p className="text-sm text-slate-400 mt-1">사용자들이 보낸 피드백을 확인하세요</p>
        </div>

        {/* Password form */}
        {list === null && (
          <form
            onSubmit={handleLoad}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex gap-3"
          >
            <input
              type="password"
              value={secret}
              onChange={e => setSecret(e.target.value)}
              placeholder="비밀번호 입력"
              autoFocus
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
            >
              {loading ? '...' : '확인'}
            </button>
          </form>
        )}

        {error && (
          <div className="mt-3 bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Stats */}
        {list !== null && counts && (
          <>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {(['bug', 'suggestion', 'compliment', 'general'] as const).map(c => (
                <div key={c} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">{counts[c]}</div>
                  <div className="text-xs text-slate-400 mt-1 leading-tight">
                    {CATEGORY_META[c].label}
                  </div>
                </div>
              ))}
            </div>

            {/* Total + refresh */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-slate-600">
                전체 {list.length}건
              </p>
              <button
                onClick={() => { setList(null); setError(null) }}
                className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors"
              >
                🔒 잠금
              </button>
            </div>

            {/* Feedback list */}
            {list.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm">아직 받은 피드백이 없어요.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {list.map(item => {
                  const meta = CATEGORY_META[item.category] ?? CATEGORY_META.general
                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>
                          {meta.label}
                        </span>
                        <span className="text-xs text-slate-400">
                          {format(new Date(item.createdAt), 'M월 d일 HH:mm', { locale: ko })}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {item.message}
                      </p>
                      {item.contact && (
                        <p className="mt-2 text-xs text-indigo-500 font-medium">
                          📩 {item.contact}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
