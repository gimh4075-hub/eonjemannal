import { Solar } from 'lunar-javascript'

// ── 고정 양력 공휴일 (월-일) ────────────────────────────
const FIXED: Record<string, string> = {
  '01-01': '신정',
  '03-01': '삼일절',
  '05-05': '어린이날',
  '06-06': '현충일',
  '08-15': '광복절',
  '10-03': '개천절',
  '10-09': '한글날',
  '12-25': '성탄절',
}

// ── 대체공휴일·선거일·임시공휴일 (자동 계산 불가, 직접 관리) ──
const SPECIAL: Record<string, string> = {
  // 대체공휴일
  '2024-02-12': '대체휴일', // 설날 연휴(일요일 겹침)
  '2024-05-06': '대체휴일', // 어린이날(일)
  '2025-03-03': '대체휴일', // 삼일절(토)
  '2025-05-06': '대체휴일', // 어린이날·부처님오신날 중복(월)
  '2025-10-08': '대체휴일', // 추석 연휴(일요일 겹침)
  '2026-03-02': '대체휴일', // 삼일절(일)
  '2026-05-25': '대체휴일', // 부처님오신날(일)
  '2026-08-17': '대체휴일', // 광복절(토)
  '2026-10-05': '대체휴일', // 개천절(토)
  '2027-02-08': '대체휴일', // 설날 연휴(일요일 겹침)
  '2027-08-16': '대체휴일', // 광복절(일)
  '2027-10-04': '대체휴일', // 개천절(일)
  '2027-10-11': '대체휴일', // 한글날(토)
  '2027-12-27': '대체휴일', // 성탄절(토)
  // 임시공휴일
  '2024-10-01': '임시휴일', // 국군의 날
  '2025-01-27': '임시휴일', // 설 연휴
  // 선거일
  '2024-04-10': '선거일', // 제22대 국회의원선거
  '2025-06-03': '선거일', // 제21대 대통령선거
  '2026-06-03': '선거일', // 제9회 전국동시지방선거
}

function iso(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** 양력 → 음력 (월/일). 윤달이면 month 가 음수. */
function lunarMonthDay(date: Date): [number, number] {
  const l = Solar.fromYmd(date.getFullYear(), date.getMonth() + 1, date.getDate()).getLunar()
  return [l.getMonth(), l.getDay()]
}

/** 음력 기반 공휴일 (설날·추석·부처님오신날). 윤달(month<0)은 제외. */
function lunarHoliday(date: Date): string | null {
  const [m, d] = lunarMonthDay(date)
  // 설날 (음력 1/1) 및 다음날
  if (m === 1 && d === 1) return '설날'
  if (m === 1 && d === 2) return '설연휴'
  // 설날 전날 (= 다음 날이 음력 1/1 인 섣달그믐)
  const next = new Date(date)
  next.setDate(date.getDate() + 1)
  const [nm, nd] = lunarMonthDay(next)
  if (nm === 1 && nd === 1) return '설연휴'
  // 부처님오신날 (음력 4/8)
  if (m === 4 && d === 8) return '부처님'
  // 추석 (음력 8/15) 및 전날·다음날
  if (m === 8 && d === 14) return '추석연휴'
  if (m === 8 && d === 15) return '추석'
  if (m === 8 && d === 16) return '추석연휴'
  return null
}

/** 해당 날짜의 한국 공휴일 이름. 공휴일이 아니면 null. */
export function getHolidayName(date: Date): string | null {
  const special = SPECIAL[iso(date)]
  if (special) return special
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const fixed = FIXED[`${mm}-${dd}`]
  if (fixed) return fixed
  return lunarHoliday(date)
}

export interface LunarDate {
  month: number
  day: number
  isLeap: boolean
}

/** 양력 → 음력 변환 */
export function getLunarDate(date: Date): LunarDate | null {
  try {
    const [m, d] = lunarMonthDay(date)
    return { month: Math.abs(m), day: d, isLeap: m < 0 }
  } catch {
    return null
  }
}

/** 음력 표시 라벨 — 1일엔 "월.1", 그 외엔 일자만 (윤달은 '윤' 접두) */
export function lunarLabel(ld: LunarDate): string {
  const prefix = ld.isLeap ? '윤' : ''
  if (ld.day === 1) return `${prefix}${ld.month}.1`
  return `${prefix}${ld.day}`
}
