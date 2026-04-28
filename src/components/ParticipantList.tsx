import { Participant } from '../types'

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
  if (participants.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 text-center text-slate-400 text-sm">
        아직 아무도 참여하지 않았어요 🙁
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">
        참여자 <span className="text-indigo-500">{participants.length}명</span>
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
                    <span className="ml-1 text-xs text-indigo-400 font-medium">(나)</span>
                  )}
                </span>
              </div>
              <span
                className={[
                  'text-xs px-2 py-0.5 rounded-full font-medium shrink-0',
                  hasSubmitted
                    ? 'bg-green-50 text-green-600'
                    : 'bg-slate-50 text-slate-400',
                ].join(' ')}
              >
                {hasSubmitted ? '제출 완료' : '미제출'}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
