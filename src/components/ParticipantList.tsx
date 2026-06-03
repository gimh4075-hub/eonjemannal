import { Participant } from '../types'
import { useLang } from '../i18n'

interface ParticipantListProps {
  participants: Participant[]
  localParticipantId?: string
  availabilityMap?: Record<string, string[]>
}

export default function ParticipantList({
  participants,
  localParticipantId,
  availabilityMap = {},
}: ParticipantListProps) {
  const { tr } = useLang()

  if (participants.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center text-slate-400 text-sm">
        {tr.noParticipants}
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        {tr.participantsTitle(participants.length).split(String(participants.length)).map((part, i) =>
          i === 0 ? <span key={i}>{part}<span className="text-indigo-500">{participants.length}</span></span> : <span key={i}>{part}</span>
        )}
      </h3>
      <ul className="space-y-2">
        {participants.map(p => {
          const isMe = p.id === localParticipantId
          const hasSubmitted = (availabilityMap[p.id] ?? []).length > 0
          return (
            <li key={p.id} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className={[
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                    isMe ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600',
                  ].join(' ')}
                >
                  {p.name.charAt(0)}
                </div>
                <span className="text-sm text-slate-700 truncate">
                  {p.name}
                  {isMe && (
                    <span className="ml-1 text-xs text-indigo-400 font-medium">{tr.me}</span>
                  )}
                </span>
              </div>
              <span
                className={[
                  'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                  hasSubmitted ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400',
                ].join(' ')}
              >
                {hasSubmitted ? tr.submitted : tr.notSubmitted}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
