import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface Notice {
  id: string
  message: string
  type: string
  createdAt: number
}

const TYPES = [
  { value: 'update',  label: '🆕 업데이트', desc: '새 기능 안내' },
  { value: 'info',    label: '📢 공지',     desc: '일반 공지사항' },
  { value: 'warning', label: '⚠️ 안내',     desc: '주의 사항' },
]

const TYPE_STYLE: Record<string, string> = {
  update:  'bg-indigo-50 border-indigo-200 text-indigo-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
}

export default function NoticesAdmin() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(false)

  const [type, setType] = useState('update')
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthError(null)
    const res = await fetch(`/api/notices?secret=${encodeURIComponent(secret)}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: '__probe__' }) })
    // 401 = wrong secret, anything else = authed
    if (res.status === 401) { setAuthError('비밀번호가 틀렸어요.'); return }
    setAuthed(true)
    loadNotices()
  }

  async function loadNotices() {
    setLoading(true)
    const res = await fetch('/api/notices')
    const data = await res.json()
    setNotices(data.notices ?? [])
    setLoading(false)
  }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) { setPostError('내용을 입력해주세요.'); return }
    setPosting(true)
    setPostError(null)
    try {
      const res = await fetch(`/api/notices?secret=${encodeURIComponent(secret)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), type }),
      })
      if (!res.ok) throw new Error('등록에 실패했습니다.')
      setMessage('')
      await loadNotices()
    } catch (err) {
      setPostError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setPosting(false)
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/notices?secret=${encodeURIComponent(secret)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await loadNotices()
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-2xl mb-3 shadow-md">
            <span className="text-xl">📣</span>
          </div>
          <h1 className="text-xl font-bold text-slate-800">공지 관리</h1>
          <p className="text-sm text-slate-400 mt-1">사용자에게 보여줄 공지를 등록하세요</p>
        </div>

        {/* Auth */}
        {!authed ? (
          <>
            <form
              onSubmit={handleAuth}
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
                className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors"
              >
                확인
              </button>
            </form>
            {authError && (
              <p className="mt-3 text-center text-sm text-red-500">{authError}</p>
            )}
          </>
        ) : (
          <>
            {/* Write form */}
            <form
              onSubmit={handlePost}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 mb-6 space-y-4"
            >
              <h2 className="font-bold text-slate-700">새 공지 등록</h2>

              {/* Type selector */}
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(t => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setType(t.value)}
                    className={[
                      'text-sm py-2 px-2 rounded-xl border transition-colors text-center',
                      type === t.value
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold'
                        : 'border-slate-200 text-slate-500 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <div>{t.label}</div>
                    <div className="text-xs opacity-60 mt-0.5">{t.desc}</div>
                  </button>
                ))}
              </div>

              {/* Preview */}
              {message && (
                <div className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-sm ${TYPE_STYLE[type]}`}>
                  <span>{TYPES.find(t => t.value === type)?.label.split(' ')[0]}</span>
                  <span>{message}</span>
                </div>
              )}

              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="공지 내용을 입력하세요&#10;예) 날짜 범위 최대 90일로 늘렸어요! 이벤트 수정에서 바꿔보세요 🎉"
                rows={3}
                className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition resize-none"
              />

              {postError && <p className="text-red-500 text-xs">{postError}</p>}

              <button
                type="submit"
                disabled={posting}
                className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl transition-colors"
              >
                {posting ? '등록 중...' : '공지 등록하기'}
              </button>
            </form>

            {/* Active notices */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-slate-700">현재 활성 공지 {notices.length}건</h2>
                <button
                  onClick={() => { setAuthed(false); setSecret('') }}
                  className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg"
                >
                  🔒 잠금
                </button>
              </div>

              {loading ? (
                <p className="text-sm text-slate-400 text-center py-6">불러오는 중...</p>
              ) : notices.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
                  등록된 공지가 없어요
                </div>
              ) : (
                notices.map(n => (
                  <div key={n.id} className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-sm ${TYPE_STYLE[n.type] ?? TYPE_STYLE.info}`}>
                    <span className="text-base leading-5 shrink-0">
                      {TYPES.find(t => t.value === n.type)?.label.split(' ')[0]}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="leading-relaxed">{n.message}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {format(new Date(n.createdAt), 'M월 d일 HH:mm 등록', { locale: ko })}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDelete(n.id)}
                      className="shrink-0 text-xs opacity-60 hover:opacity-100 border border-current rounded-lg px-2 py-1 transition-opacity"
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
