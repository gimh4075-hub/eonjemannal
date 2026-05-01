import { useState } from 'react'

const CATEGORIES = [
  { value: 'bug', label: '🐛 버그 신고' },
  { value: 'suggestion', label: '💡 기능 제안' },
  { value: 'compliment', label: '🙌 칭찬해요' },
  { value: 'general', label: '💬 기타 의견' },
]

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleOpen() {
    setOpen(true)
    setDone(false)
    setError(null)
    setMessage('')
    setContact('')
    setCategory('general')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) { setError('내용을 입력해주세요.'); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim(), contact: contact.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || '전송에 실패했습니다.')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={handleOpen}
        className="fixed bottom-5 right-5 z-40 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg transition-colors flex items-center gap-2"
      >
        <span>💬</span> 피드백
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            {done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🙏</div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">감사합니다!</h2>
                <p className="text-sm text-slate-400 mb-5">소중한 의견을 꼭 반영할게요.</p>
                <button
                  onClick={() => setOpen(false)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors"
                >
                  닫기
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">피드백 보내기</h2>
                  <button
                    onClick={() => setOpen(false)}
                    className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none"
                  >
                    ×
                  </button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Category */}
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setCategory(c.value)}
                        className={[
                          'text-sm py-2 px-3 rounded-xl border transition-colors text-left',
                          category === c.value
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      내용 <span className="text-red-400">*</span>
                    </label>
                    <textarea
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      placeholder="자유롭게 작성해주세요"
                      rows={4}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition resize-none"
                    />
                  </div>

                  {/* Contact (optional) */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      연락처 <span className="text-slate-400 font-normal">(선택 · 답장을 원하시면)</span>
                    </label>
                    <input
                      type="text"
                      value={contact}
                      onChange={e => setContact(e.target.value)}
                      placeholder="이메일 또는 카카오 ID"
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition"
                    />
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
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        전송 중...
                      </>
                    ) : '전송하기'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
