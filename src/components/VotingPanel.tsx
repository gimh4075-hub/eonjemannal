import { format, parseISO } from 'date-fns'
import { ko } from 'date-fns/locale'
import { DateOverlap, VotesResult } from '../types'

interface VotingPanelProps {
  topDates: DateOverlap[]
  votesResult: VotesResult | null
  totalParticipants: number
  localParticipantId?: string
  onVote: (date: string) => void
  voting: boolean
}

export default function VotingPanel({
  topDates,
  votesResult,
  totalParticipants,
  localParticipantId,
  onVote,
  voting,
}: VotingPanelProps) {
  const votesByDate = votesResult?.votesByDate ?? {}
  const myVotes = votesResult?.myVotes ?? {}

  const myCurrentVote = localParticipantId ? myVotes[localParticipantId] : undefined

  const maxVotes = Math.max(...topDates.map(d => votesByDate[d.date]?.count ?? 0), 1)

  if (topDates.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center text-slate-400 text-sm">
        투표할 날짜가 없습니다.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
      <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
        🗳️ 날짜 투표
      </h3>
      <p className="text-xs text-slate-400 mb-4">원하는 날짜에 투표하세요. 투표는 변경할 수 있습니다.</p>
      <div className="space-y-3">
        {topDates.slice(0, 5).map(d => {
          const voteInfo = votesByDate[d.date]
          const voteCount = voteInfo?.count ?? 0
          const voters = voteInfo?.voters ?? []
          const isLeading = voteCount === maxVotes && voteCount > 0
          const isMyVote = myCurrentVote === d.date
          const pct = totalParticipants > 0 ? Math.round((voteCount / totalParticipants) * 100) : 0
          const barPct = maxVotes > 0 ? Math.round((voteCount / maxVotes) * 100) : 0

          return (
            <div
              key={d.date}
              className={[
                'rounded-xl border p-3 transition-all',
                isMyVote ? 'border-indigo-300 bg-indigo-50' : 'border-slate-100 bg-slate-50',
              ].join(' ')}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isLeading && <span className="text-base" title="최다 득표">⭐</span>}
                  <span className="font-semibold text-slate-700">
                    {format(parseISO(d.date), 'M월 d일 (EEE)', { locale: ko })}
                  </span>
                  <span className="text-xs text-slate-400">
                    가능 {d.count}/{totalParticipants}명
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">
                    {voteCount}표 ({pct}%)
                  </span>
                  <button
                    onClick={() => onVote(d.date)}
                    disabled={voting}
                    className={[
                      'px-3 py-1 rounded-full text-xs font-semibold transition-all',
                      isMyVote
                        ? 'bg-indigo-500 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-300',
                      voting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                    ].join(' ')}
                  >
                    {isMyVote ? '✓ 내 투표' : '투표하기'}
                  </button>
                </div>
              </div>

              {/* Vote bar */}
              <div className="w-full bg-slate-200 rounded-full h-1.5 mb-2">
                <div
                  className="bg-indigo-400 h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${barPct}%` }}
                />
              </div>

              {/* Voters list */}
              {voters.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {voters.map(name => (
                    <span
                      key={name}
                      className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              )}

              {isLeading && voteCount > 0 && (
                <div className="mt-1">
                  <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    최다 득표일
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
