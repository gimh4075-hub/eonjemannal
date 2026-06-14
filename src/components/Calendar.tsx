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
import { DateOverlap } from '../types'
import { useLang } from '../i18n'
import { getHolidayName, getLunarDate, lunarLabel } from '../utils/koreanCalendar'

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

  const { tr, locale, lang } = useLang()
  const showKorean = lang === 'ko'
  const overlapMap = new Map(overlaps.map(o => [o.date, o]))

  function getDateStatus(day: Date) {
    const iso = format(day, 'yyyy-MM-dd')
    const inRange = isWithinInterval(day, { start: rangeStartDate, end: rangeEndDate })
    const inMonth = isSameMonth(day, currentMonth)
    const selected = selectedDates.includes(iso)
    const overlap = overlapMap.get(iso)
    const isSunday = day.getDay() === 0
    const holiday = showKorean ? getHolidayName(day) : null
    const lunar = showKorean && inMonth ? getLunarDate(day) : null

    let ringClass = ''
    if (overlap && totalParticipants > 0) {
      if (overlap.isPerfectMatch) {
        ringClass = 'ring-2 ring-green-500'
      } else if (overlap.count > 0) {
        ringClass = 'ring-2 ring-amber-400'
      }
    }

    return { iso, inRange, inMonth, selected, overlap, ringClass, isSunday, holiday, lunar }
  }

  const weekDays = tr.weekDays

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
          {format(currentMonth, tr.monthFormat, { locale })}
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
      <div className="grid grid-cols-7">
        {days.map(day => {
          const { iso, inRange, inMonth, selected, ringClass, isSunday, holiday, lunar } = getDateStatus(day)
          const todayDot = isToday(day)
          const disabled = !inRange || readOnly
          const dimmed = !inMonth || !inRange
          const isRed = !dimmed && !selected && (isSunday || !!holiday)

          return (
            <div
              key={iso}
              className={`flex flex-col items-center ${showKorean ? 'py-0.5 gap-px' : 'p-0.5'}`}
            >
              <button
                disabled={disabled}
                onClick={() => !disabled && onToggleDate(iso)}
                className={[
                  'relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-150',
                  dimmed ? 'text-slate-300 cursor-default' : isRed ? 'text-red-500' : 'text-slate-700',
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

              {/* 음력 + 공휴일 라벨 (한국어만) */}
              {showKorean && inMonth && (
                <div className="flex flex-col items-center leading-none gap-px min-h-[18px]">
                  {holiday ? (
                    <span className={`text-[8px] font-medium truncate max-w-[36px] text-center leading-none ${
                      selected ? 'text-green-600' : 'text-red-400'
                    }`}>
                      {holiday.length > 4 ? holiday.slice(0, 4) : holiday}
                    </span>
                  ) : lunar ? (
                    <span className={`text-[9px] leading-none ${
                      selected ? 'text-green-600' : dimmed ? 'text-slate-200' : 'text-slate-400'
                    }`}>
                      {lunarLabel(lunar)}
                    </span>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 border-t border-slate-100 pt-3">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500 inline-block" /> {tr.legendSelected}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ring-2 ring-green-500 inline-block" /> {tr.allAvailable}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full ring-2 ring-amber-400 inline-block" /> {tr.legendSomeAvail}
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> {tr.legendToday}
        </span>
        {showKorean && (
          <>
            <span className="flex items-center gap-1">
              <span className="text-red-500 font-semibold">7</span> {tr.legendHoliday}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-slate-400 text-[10px]">5.1</span> {tr.legendLunar}
            </span>
          </>
        )}
      </div>
    </div>
  )
}
