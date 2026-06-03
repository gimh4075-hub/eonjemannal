import { useState } from 'react'
import { useLang } from '../i18n'

export default function FeedbackButton() {
  const { tr } = useLang()
  const [open, setOpen] = useState(false)
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const CATEGORIES = [
    { value: 'bug',        label: tr.feedbackBug },
    { value: 'suggestion', label: tr.feedbackSuggestion },
    { value: 'compliment', label: tr.feedbackCompliment },
    { value: 'general',    label: tr.feedbackGeneral },
  ]

  function handleOpen() {
    setOpen(true); setDone(false); setError(null); setMessage(''); setContact(''); setCategory('general')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) { setError(tr.errFeedback); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, message: message.trim(), contact: contact.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || tr.feedbackSend)
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : tr.errFeedback)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={handleOpen}
        className="fixed bottom-5 right-5 z-40 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 rounded-full shadow-lg transition-colors flex items-center gap-2">
        {tr.feedbackBtn}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md">
            {done ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-3">🙏</div>
                <h2 className="text-lg font-bold text-slate-800 mb-1">{tr.feedbackDoneTitle}</h2>
                <p className="text-sm text-slate-400 mb-5">{tr.feedbackDoneDesc}</p>
                <button onClick={() => setOpen(false)}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-2.5 rounded-xl transition-colors">
                  {tr.close}
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-800">{tr.feedbackTitle}</h2>
                  <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors text-xl leading-none">×</button>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(c => (
                      <button key={c.value} type="button" onClick={() => setCategory(c.value)}
                        className={[
                          'text-sm py-2 px-3 rounded-xl border transition-colors text-left',
                          category === c.value
                            ? 'border-indigo-400 bg-indigo-50 text-indigo-700 font-semibold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50',
                        ].join(' ')}>
                        {c.label}
                      </button>
                    ))}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {tr.feedbackContent} <span className="text-red-400">*</span>
                    </label>
                    <textarea value={message} onChange={e => setMessage(e.target.value)}
                      placeholder={tr.feedbackPlaceholder} rows={4}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      {tr.feedbackContact} <span className="text-slate-400 font-normal">{tr.feedbackContactDesc}</span>
                    </label>
                    <input type="text" value={contact} onChange={e => setContact(e.target.value)}
                      placeholder={tr.feedbackContactPlaceholder}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 transition" />
                  </div>
                  {error && <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>}
                  <button type="submit" disabled={loading}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                    {loading ? (
                      <><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>{tr.feedbackSending}</>
                    ) : tr.feedbackSend}
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
