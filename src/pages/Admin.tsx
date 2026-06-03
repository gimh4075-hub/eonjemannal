import { useState } from 'react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

// ── 타입 ──────────────────────────────────────────────
interface FeedbackItem {
  id: string; category: string; message: string; contact: string; createdAt: number
}
interface Notice {
  id: string; message: string; type: string; createdAt: number
}

// ── 상수 ──────────────────────────────────────────────
const FEEDBACK_META: Record<string, { label: string; color: string }> = {
  bug:        { label: '🐛 버그 신고', color: 'bg-red-100 text-red-700' },
  suggestion: { label: '💡 기능 제안', color: 'bg-yellow-100 text-yellow-700' },
  compliment: { label: '🙌 칭찬해요',  color: 'bg-green-100 text-green-700' },
  general:    { label: '💬 기타 의견', color: 'bg-slate-100 text-slate-600' },
}

const NOTICE_TYPES = [
  { value: 'update',  label: '🆕 업데이트', desc: '새 기능 안내' },
  { value: 'info',    label: '📢 공지',     desc: '일반 공지사항' },
  { value: 'warning', label: '⚠️ 안내',     desc: '주의 사항' },
]
const NOTICE_STYLE: Record<string, string> = {
  update:  'bg-indigo-50 border-indigo-200 text-indigo-800',
  info:    'bg-blue-50 border-blue-200 text-blue-800',
  warning: 'bg-amber-50 border-amber-200 text-amber-800',
}

// ── 메인 컴포넌트 ──────────────────────────────────────
export default function Admin() {
  const [secret, setSecret] = useState('')
  const [authed, setAuthed] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authLoading, setAuthLoading] = useState(false)
  const [tab, setTab] = useState<'notices' | 'feedback'>('notices')

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)
    // feedback GET으로 인증 확인
    const res = await fetch(`/api/feedback?secret=${encodeURIComponent(secret.trim())}`)
    setAuthLoading(false)
    if (res.status === 401) { setAuthError('비밀번호가 틀렸어요.'); return }
    setAuthed(true)
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-500 rounded-2xl mb-3 shadow-md">
              <span className="text-xl">🔐</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">개발자 관리</h1>
            <p className="text-sm text-slate-400 mt-1">비밀번호를 입력하세요</p>
          </div>
          <form onSubmit={handleAuth} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex gap-3">
            <input
              type="password" value={secret} onChange={e => setSecret(e.target.value)}
              placeholder="비밀번호" autoFocus
              className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
            />
            <button type="submit" disabled={authLoading}
              className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors">
              {authLoading ? '...' : '확인'}
            </button>
          </form>
          {authError && <p className="mt-3 text-center text-sm text-red-500">{authError}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">개발자 관리</h1>
            <p className="text-sm text-slate-400 mt-0.5">공지 등록 및 피드백 확인</p>
          </div>
          <button onClick={() => { setAuthed(false); setSecret('') }}
            className="text-xs text-slate-400 hover:text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg transition-colors">
            🔒 잠금
          </button>
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6 bg-white rounded-2xl border border-slate-100 shadow-sm p-1.5">
          {([['notices', '📣 공지 관리'], ['feedback', '📬 피드백']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={[
                'flex-1 py-2 rounded-xl text-sm font-semibold transition-colors',
                tab === key ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50',
              ].join(' ')}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'notices'  && <NoticesTab secret={secret} />}
        {tab === 'feedback' && <FeedbackTab secret={secret} />}
      </div>
    </div>
  )
}

// ── 공지 탭 ───────────────────────────────────────────
function NoticesTab({ secret }: { secret: string }) {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loaded, setLoaded] = useState(false)
  const [type, setType] = useState('update')
  const [message, setMessage] = useState('')
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState<string | null>(null)

  async function load() {
    const res = await fetch('/api/notices')
    const data = await res.json()
    setNotices(data.notices ?? [])
    setLoaded(true)
  }

  if (!loaded) { load(); return null }

  async function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) { setPostError('내용을 입력해주세요.'); return }
    setPosting(true); setPostError(null)
    try {
      const res = await fetch(`/api/notices?secret=${encodeURIComponent(secret)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim(), type }),
      })
      if (!res.ok) throw new Error('등록에 실패했습니다.')
      setMessage('')
      await load()
    } catch (err) {
      setPostError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally { setPosting(false) }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/notices?secret=${encodeURIComponent(secret)}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await load()
  }

  return (
    <div className="space-y-6">
      {/* 등록 폼 */}
      <form onSubmit={handlePost} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-4">
        <h2 className="font-bold text-slate-700">새 공지 등록</h2>
        <div className="grid grid-cols-3 gap-2">
          {NOTICE_TYPES.map(t => (
            <button key={t.value} type="button" onClick={() => setType(t.value)}
              className={[
                'text-sm py-2 px-2 rounded-xl border transition-colors text-center',
                type === t.value
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold'
                  : 'border-slate-200 text-slate-500 hover:bg-slate-50',
              ].join(' ')}>
              <div>{t.label}</div>
              <div className="text-xs opacity-60 mt-0.5">{t.desc}</div>
            </button>
          ))}
        </div>

        {message && (
          <div className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-sm ${NOTICE_STYLE[type]}`}>
            <span>{NOTICE_TYPES.find(t => t.value === type)?.label.split(' ')[0]}</span>
            <span>{message}</span>
          </div>
        )}

        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder="공지 내용을 입력하세요&#10;예) 이름 변경 기능이 추가됐어요! 헤더의 👤 버튼을 눌러보세요 🎉"
          rows={3}
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition resize-none"
        />
        {postError && <p className="text-red-500 text-xs">{postError}</p>}
        <button type="submit" disabled={posting}
          className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-xl transition-colors">
          {posting ? '등록 중...' : '공지 등록하기'}
        </button>
      </form>

      {/* 활성 공지 목록 */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-600">현재 활성 공지 {notices.length}건</p>
        {notices.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-slate-400 text-sm">
            등록된 공지가 없어요
          </div>
        ) : notices.map(n => (
          <div key={n.id} className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-sm ${NOTICE_STYLE[n.type] ?? NOTICE_STYLE.info}`}>
            <span className="text-base leading-5 shrink-0">
              {NOTICE_TYPES.find(t => t.value === n.type)?.label.split(' ')[0]}
            </span>
            <div className="flex-1 min-w-0">
              <p className="leading-relaxed">{n.message}</p>
              <p className="text-xs opacity-60 mt-1">
                {format(new Date(n.createdAt), 'M월 d일 HH:mm 등록', { locale: ko })}
              </p>
            </div>
            <button onClick={() => handleDelete(n.id)}
              className="shrink-0 text-xs opacity-60 hover:opacity-100 border border-current rounded-lg px-2 py-1 transition-opacity">
              삭제
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── 피드백 탭 ─────────────────────────────────────────
function FeedbackTab({ secret }: { secret: string }) {
  const [list, setList] = useState<FeedbackItem[]>([])
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function load() {
    try {
      const res = await fetch(`/api/feedback?secret=${encodeURIComponent(secret)}`)
      if (!res.ok) throw new Error('불러오기에 실패했습니다.')
      const data = await res.json()
      setList(data.feedback)
      setLoaded(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    }
  }

  if (!loaded && !error) { load(); return null }

  const counts = Object.fromEntries(
    ['bug', 'suggestion', 'compliment', 'general'].map(c => [c, list.filter(f => f.category === c).length])
  )

  return (
    <div className="space-y-4">
      {error ? (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl text-center">{error}</div>
      ) : (
        <>
          {/* 통계 */}
          <div className="grid grid-cols-4 gap-3">
            {(['bug', 'suggestion', 'compliment', 'general'] as const).map(c => (
              <div key={c} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
                <div className="text-2xl font-bold text-slate-800">{counts[c]}</div>
                <div className="text-xs text-slate-400 mt-1 leading-tight">{FEEDBACK_META[c].label}</div>
              </div>
            ))}
          </div>

          <p className="text-sm font-semibold text-slate-600">전체 {list.length}건</p>

          {list.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-10 text-center text-slate-400">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-sm">아직 받은 피드백이 없어요.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {list.map(item => {
                const meta = FEEDBACK_META[item.category] ?? FEEDBACK_META.general
                return (
                  <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${meta.color}`}>{meta.label}</span>
                      <span className="text-xs text-slate-400">
                        {format(new Date(item.createdAt), 'M월 d일 HH:mm', { locale: ko })}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{item.message}</p>
                    {item.contact && <p className="mt-2 text-xs text-indigo-500 font-medium">📩 {item.contact}</p>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
