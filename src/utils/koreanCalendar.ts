import { Solar } from 'lunar-javascript'

// ── 고정 공휴일 (월-일) ─────────────────────────────────
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

// ── 변동 공휴일 (음력 기반, 2024-2028 태양력 환산) ──────
const VARIABLE: Record<string, string> = {
  // 2024
  '2024-02-09': '설날 전날',
  '2024-02-10': '설날',
  '2024-02-11': '설날 다음날',
  '2024-05-15': '부처님오신날',
  '2024-09-16': '추석 전날',
  '2024-09-17': '추석',
  '2024-09-18': '추석 다음날',
  // 2025
  '2025-01-28': '설날 전날',
  '2025-01-29': '설날',
  '2025-01-30': '설날 다음날',
  '2025-05-05': '부처님오신날',
  '2025-05-06': '대체공휴일',   // 부처님오신날 == 어린이날
  '2025-10-05': '추석 전날',
  '2025-10-06': '추석',
  '2025-10-07': '추석 다음날',
  '2025-10-08': '대체공휴일',   // 추석연휴 일요일 겹침
  // 2026
  '2026-02-16': '설날 전날',
  '2026-02-17': '설날',
  '2026-02-18': '설날 다음날',
  '2026-05-24': '부처님오신날',
  '2026-09-24': '추석 전날',
  '2026-09-25': '추석',
  '2026-09-26': '추석 다음날',
  // 2027
  '2027-02-05': '설날 전날',
  '2027-02-06': '설날',
  '2027-02-07': '설날 다음날',
  '2027-05-13': '부처님오신날',
  '2027-09-14': '추석 전날',
  '2027-09-15': '추석',
  '2027-09-16': '추석 다음날',
  // 2028
  '2028-01-25': '설날 전날',
  '2028-01-26': '설날',
  '2028-01-27': '설날 다음날',
  '2028-05-02': '부처님오신날',
  '2028-10-02': '추석 전날',
  '2028-10-03': '추석',
  '2028-10-04': '추석 다음날',
}

/** 해당 날짜의 한국 공휴일 이름. 공휴일이 아니면 null. */
export function getHolidayName(date: Date): string | null {
  const year = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  const iso = `${year}-${mm}-${dd}`
  const md = `${mm}-${dd}`
  return VARIABLE[iso] ?? FIXED[md] ?? null
}

export interface LunarDate {
  month: number
  day: number
  isLeap: boolean
}

/** 양력 → 음력 변환 */
export function getLunarDate(date: Date): LunarDate | null {
  try {
    const solar = Solar.fromYmd(
      date.getFullYear(),
      date.getMonth() + 1,
      date.getDate(),
    )
    const lunar = solar.getLunar()
    return {
      month: lunar.getMonth(),
      day: lunar.getDay(),
      isLeap: lunar.isLeap(),
    }
  } catch {
    return null
  }
}

/** 음력 날짜 표시 문자열 */
export function lunarLabel(ld: LunarDate): string {
  if (ld.day === 1) return ld.isLeap ? `윤${ld.month}/1` : `${ld.month}/초하루`
  if (ld.day === 15 && !ld.isLeap) return `${ld.month}/보름`
  return ld.isLeap ? `윤${ld.month}/${ld.day}` : `${ld.month}/${ld.day}`
}
