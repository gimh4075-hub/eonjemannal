import { useState, useEffect } from 'react'
import { useLang } from '../i18n'

interface Notice {
  id: string
  message: string
  translations?: Record<string, string>
  type: string
  createdAt: number
}

export default function NoticeBanner() {
  const { tr, lang } = useLang()
  const [notices, setNotices] = useState<Notice[]>([])
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('eonjemannal_dismissed_notices')
      return new Set(raw ? JSON.parse(raw) : [])
    } catch { return new Set() }
  })

  const TYPE_STYLE: Record<string, { bar: string; icon: string; label: string }> = {
    update:  { bar: 'bg-indigo-50 border-indigo-200 text-indigo-800', icon: '🆕', label: tr.noticeUpdate },
    info:    { bar: 'bg-blue-50 border-blue-200 text-blue-800',       icon: '📢', label: tr.noticeInfo },
    warning: { bar: 'bg-amber-50 border-amber-200 text-amber-800',    icon: '⚠️', label: tr.noticeWarning },
  }

  useEffect(() => {
    fetch('/api/notices')
      .then(r => r.json())
      .then(d => setNotices(d.notices ?? []))
      .catch(() => {})
  }, [])

  function dismiss(id: string) {
    const next = new Set([...dismissed, id])
    setDismissed(next)
    try {
      localStorage.setItem('eonjemannal_dismissed_notices', JSON.stringify([...next]))
    } catch {}
  }

  const visible = notices.filter(n => !dismissed.has(n.id))
  if (visible.length === 0) return null

  return (
    <div className="space-y-2 mb-5">
      {visible.map(n => {
        const style = TYPE_STYLE[n.type] ?? TYPE_STYLE.info
        return (
          <div key={n.id} className={`flex items-start gap-3 border rounded-xl px-4 py-3 text-sm ${style.bar}`}>
            <span className="text-base leading-5 shrink-0">{style.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="font-semibold mr-1.5">[{style.label}]</span>
              <span className="leading-relaxed">{n.translations?.[lang] || n.message}</span>
            </div>
            <button onClick={() => dismiss(n.id)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity text-base leading-none">×</button>
          </div>
        )
      })}
    </div>
  )
}
