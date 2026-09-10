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
  return new Date(iso).getTime() < startOfDay(ref).getTime()
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

export function isoFrom(offsetMs: number, ref: Date = new Date()): string {
  return new Date(ref.getTime() + offsetMs).toISOString()
}

export function daysFromNow(n: number, ref: Date = new Date()): string {
  const d = startOfDay(ref)
  d.setDate(d.getDate() + n)
  return d.toISOString()
}
