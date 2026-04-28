import { format, parseISO, eachDayOfInterval } from 'date-fns'
import { ko } from 'date-fns/locale'
import { Participant, AvailabilityResult } from '../types'

interface AvailabilityGridProps {
  result: AvailabilityResult
  rangeStart: string
  rangeEnd: string
}

export default function AvailabilityGrid({ result, rangeStart, rangeEnd }: AvailabilityGridProps) {
  const { participants, availability, totalParticipants } = result

  const allDates = eachDayOfInterval({
    start: parseISO(rangeStart),
    end: parseISO(rangeEnd),
  }).map(d => format(d, 'yyyy-MM-dd'))

  // Only show dates that have at least one person available
  const activeDates = allDates.filter(d =>
    participants.some(p => (availability[p.id] ?? []).includes(d))
  )

  if (participants.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center text-slate-400">
        아직 아무도 참여하지 않았어요 🙁
      </div>
    )
  }

  if (activeDates.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 text-center text-slate-400">
        아직 가능한 날짜를 선택한 참여자가 없어요.
      </div>
    )
  }

  function getCount(date: string) {
    return participants.filter(p => (availability[p.id] ?? []).includes(date)).length
  }

  function isPerfect(date: string) {
    return totalParticipants > 0 && getCount(date) === totalParticipants
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 overflow-x-auto">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">참여자별 가능 날짜</h3>
      <table className="min-w-full text-xs border-collapse">
        <thead>
          <tr>
            <th className="text-left py-1.5 pr-3 font-medium text-slate-500 whitespace-nowrap min-w-[80px]">
              이름
            </th>
            {activeDates.map(date => (
              <th
                key={date}
                className={[
                  'text-center py-1.5 px-1 font-medium whitespace-nowrap min-w-[44px]',
                  isPerfect(date) ? 'text-green-600' : 'text-slate-500',
                ].join(' ')}
              >
                <div>{format(parseISO(date), 'M/d', { locale: ko })}</div>
                <div className="text-slate-400 font-normal">
                  {format(parseISO(date), 'EEE', { locale: ko })}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {participants.map((p: Participant) => (
            <tr key={p.id} className="border-t border-slate-50">
              <td className="py-2 pr-3 font-medium text-slate-700 whitespace-nowrap">{p.name}</td>
              {activeDates.map(date => {
                const avail = (availability[p.id] ?? []).includes(date)
                return (
                  <td key={date} className="text-center py-2 px-1">
                    {avail ? (
                      <span className="text-green-500 text-base">✓</span>
                    ) : (
                      <span className="text-slate-200 text-base">–</span>
                    )}
                  </td>
                )
              })}
            </tr>
          ))}
          {/* Summary row */}
          <tr className="border-t-2 border-slate-200">
            <td className="py-2 pr-3 font-semibold text-slate-600">합계</td>
            {activeDates.map(date => {
              const count = getCount(date)
              const perfect = isPerfect(date)
              return (
                <td key={date} className="text-center py-2 px-1">
                  <span
                    className={[
                      'text-xs font-semibold px-1.5 py-0.5 rounded-full',
                      perfect
                        ? 'bg-green-100 text-green-700'
                        : count > 0
                        ? 'bg-amber-50 text-amber-700'
                        : 'text-slate-300',
                    ].join(' ')}
                  >
                    {count}/{totalParticipants}
                  </span>
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>
    </div>
  )
}
