export const DAY_START = 6 * 60
export const DAY_END = 24 * 60
export const PLAN_FROM = 9 * 60
export const PLAN_TO = 21 * 60
export const STEP = 15
export const HOUR_PX = 52
export const PX_PER_MIN = HOUR_PX / 60

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

const pad = (n: number) => String(n).padStart(2, '0')

export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const result = new Date(d)
  result.setDate(d.getDate() + n)
  return result
}

export const weekdayOf = (d: Date) => (d.getDay() + 6) % 7

export function startOfWeek(d: Date): Date {
  const monday = addDays(d, -weekdayOf(d))
  monday.setHours(0, 0, 0, 0)
  return monday
}

export const weekKeys = (monday: Date) =>
  Array.from({ length: 7 }, (_, i) => toKey(addDays(monday, i)))

export const formatTime = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

export function parseTime(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return h * 60 + m
}

export const snap = (min: number) => Math.round(min / STEP) * STEP
export const ceilStep = (min: number) => Math.ceil(min / STEP) * STEP
export const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi)

export function nowMinutes(): number {
  const now = new Date()
  return now.getHours() * 60 + now.getMinutes()
}

export function formatDuration(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return [h && `${h} ч`, m && `${m} мин`].filter(Boolean).join(' ')
}

const dayMonth = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'long' })
const shortDate = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short' })

export function weekLabel(monday: Date): string {
  const sunday = addDays(monday, 6)
  const tail = `${dayMonth.format(sunday)} ${sunday.getFullYear()}`
  return monday.getMonth() === sunday.getMonth()
    ? `${monday.getDate()}–${tail}`
    : `${dayMonth.format(monday)} – ${tail}`
}

export const formatShortDate = (key: string) => shortDate.format(fromKey(key))

export const blockPosition = (start: number, end: number) => ({
  top: (start - DAY_START) * PX_PER_MIN,
  height: (end - start) * PX_PER_MIN,
})
