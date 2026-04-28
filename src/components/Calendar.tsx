import { useState } from 'react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
  isWithinInterval,
} from 'date-fns'
import { ko } from 'date-fns/locale'
import { DateOverlap } from '../types'

interface CalendarProps {
  rangeStart: string
  rangeEnd: string
  selectedDates: string[]
  onToggleDate: (date: string) => void
  overlaps?: DateOverlap[]
  totalParticipants?: number
  readOnly?: boolean
}

export default function Calendar({
  rangeStart,
  rangeEnd,
  selectedDates,
  onToggleDate,
  overlaps = [],
  totalParticipants = 0,
  readOnly = false,
}: CalendarProps) {
  const rangeStartDate = parseISO(rangeStart)
  const rangeEndDate = parseISO(rangeEnd)

  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date()
    if (isWithinInterval(today, { start: rangeStartDate, end: rangeEndDate })) {
      return today
    }
    return rangeStartDate
  })

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })
  const days = eachDayOfInterval({ start: calStart, end: calEnd })

  const overlapMap = new Map(overlaps.map(o => [o.date, o]))

  function getDateStatus(date: Date) {
    const iso = format(date, 'yyyy-MM-dd')
    const inRange = isWithinInterval(date, { start: rangeStartDate, end: rangeEndDate })
    const inMonth = isSameMonth(date, currentMonth)
    const selected = selectedDates.includes(iso)
    const overlap = overlapMap.get(iso)

    let ringClass = ''
    if (overlap && totalParticipants > 0) {
      if (overlap.isPerfectMatch) {
        ringClass = 'ring-2 ring-green-500'
      } else if (overlap.count > 0) {
        ringClass = 'ring-2 ring-amber-400'
      }
    }

    return { iso, inRange, inMonth, selected, overlap, ringClass }
  }

  const weekDays = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setCurrentMonth(m => subMonths(m, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-600"
          aria-label="이전 달"
        >
          ‹
        </button>
        <h2 className="text-base font-semibold text-slate-800">
          {format(currentMonth, 'yyyy년 M월', { locale: ko })}
        </h2>
        <button
          onClick={() => setCurrentMonth(m => addMonths(m, 1))}
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-slate-600"
          aria-label="다음 달"
        >
          ›
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((d, i) => (
          <div
            key={d}
            className={`text-center text-xs font-medium py-1 ${
              i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-slate-400'
            }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Days grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {days.map(day => {
          const { iso, inRange, inMonth, selected, ringClass } = getDateStatus(day)
          const todayDot = isToday(day)
          const disabled = !inRange || readOnly
          const dimmed = !inMonth || !inRange

          return (
            <div key={iso} className="flex items-center justify-center p-0.5">
              <button
                disabled={disabled}
                onClick={() => !disabled && onToggleDate(iso)}
                className={[
                  'relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-150',
                  dimmed ? 'text-slate-300 cursor-default' : 'text-slate-700',
                  inRange && !readOnly ? 'hover:bg-indigo-50 cursor-pointer active:scale-95' : '',
                  selected ? '!bg-green-500 !text-white shadow-md' : '',
                  ringClass,
                  disabled && !dimmed ? 'cursor-default' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                {format(day, 'd')}
                {todayDot && !selected && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> 내가 선택
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ring-2 ring-green-500 inline-block" /> 전원 가능
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ring-2 ring-amber-400 inline-block" /> 일부 가능
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> 오늘
        </span>
      </div>
    </div>
  )
}
