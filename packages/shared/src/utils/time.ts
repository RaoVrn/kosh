const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export function startOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(0, 0, 0, 0)
  return c
}

export function endOfDay(d: Date): Date {
  const c = new Date(d)
  c.setHours(23, 59, 59, 999)
  return c
}

export function isSameDay(a: Date, b: Date): boolean {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

export function isToday(iso: string, ref: Date = new Date()): boolean {
  return isSameDay(new Date(iso), ref)
}

export function isDueToday(iso: string, ref: Date = new Date()): boolean {
  return isToday(iso, ref)
}

export function isTomorrow(iso: string, ref: Date = new Date()): boolean {
  const tomorrow = startOfDay(ref)
  tomorrow.setDate(tomorrow.getDate() + 1)
  return isSameDay(new Date(iso), tomorrow)
}

export function isOverdue(iso: string, ref: Date = new Date()): boolean {
  return new Date(iso).getTime() < ref.getTime()
}

export function isUpcoming(iso: string, ref: Date = new Date()): boolean {
  return new Date(iso).getTime() > endOfDay(ref).getTime()
}

export function relativeTime(iso: string, ref: Date = new Date()): string {
  const diff = ref.getTime() - new Date(iso).getTime()
  if (diff < MINUTE) return 'Just now'
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m ago`
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h ago`
  const dayDiff = Math.floor(diff / DAY)
  if (dayDiff === 1) return 'Yesterday'
  if (dayDiff < 7) return `${dayDiff}d ago`
  return formatShortDate(iso)
}

export function formatShortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function formatDue(iso: string, ref: Date = new Date()): string {
  if (isToday(iso, ref)) return 'Today'
  if (isTomorrow(iso, ref)) return 'Tomorrow'
  if (isOverdue(iso, ref)) return 'Overdue'
  const d = new Date(iso)
  const dayDiff = Math.round((startOfDay(d).getTime() - startOfDay(ref).getTime()) / DAY)
  if (dayDiff > 0 && dayDiff < 7) {
    return d.toLocaleDateString(undefined, { weekday: 'short' })
  }
  return formatShortDate(iso)
}

export function formatFull(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function greetingForHour(hour: number): string {
  if (hour < 5) return 'Good evening'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function isoFrom(offsetMs: number, ref: Date = new Date()): string {
  return new Date(ref.getTime() + offsetMs).toISOString()
}

export function daysFromNow(n: number, ref: Date = new Date()): string {
  const d = startOfDay(ref)
  d.setDate(d.getDate() + n)
  return d.toISOString()
}

export function endOfDayFromNow(n: number, ref: Date = new Date()): string {
  const d = startOfDay(ref)
  d.setDate(d.getDate() + n)
  return endOfDay(d).toISOString()
}

export function atTimeOnDay(
  days: number,
  hour: number,
  minute: number,
  ref: Date = new Date(),
): string {
  const d = startOfDay(ref)
  d.setDate(d.getDate() + days)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatDueAt(iso: string, ref: Date = new Date()): string {
  if (isToday(iso, ref)) return `Today, ${formatTime(iso)}`
  if (isTomorrow(iso, ref)) return `Tomorrow, ${formatTime(iso)}`
  return `${formatDue(iso, ref)}, ${formatTime(iso)}`
}

export function formatReminderAt(iso: string, ref: Date = new Date()): string {
  return formatDueAt(iso, ref)
}

export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDatetimeLocalValue(value: string): string {
  const [date, time] = value.split('T')
  const [y, mo, d] = (date ?? '').split('-').map((n) => Number(n))
  const [hh, mm] = (time ?? '00:00').split(':').map((n) => Number(n))
  return new Date(y ?? 0, (mo ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0).toISOString()
}
