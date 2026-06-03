import { useState } from 'react'
import { useLang, LANG_LABELS, Lang } from '../i18n'

const LANGS = Object.entries(LANG_LABELS) as [Lang, string][]

export default function LanguageSwitcher() {
  const { lang, setLang } = useLang()
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="fixed bottom-16 left-5 z-40 bg-white border border-slate-200 text-slate-600 text-sm font-medium px-3 py-2 rounded-full shadow-md hover:bg-slate-50 transition-colors flex items-center gap-1.5"
      >
        🌐 {LANG_LABELS[lang]}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="fixed bottom-28 left-5 z-40 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
            {LANGS.map(([code, label]) => (
              <button
                key={code}
                onClick={() => { setLang(code); setOpen(false) }}
                className={[
                  'w-full text-left px-4 py-2.5 text-sm transition-colors flex items-center gap-2',
                  lang === code
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50',
                ].join(' ')}
              >
                {lang === code && <span className="text-indigo-500">✓</span>}
                {lang !== code && <span className="w-4" />}
                {label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
