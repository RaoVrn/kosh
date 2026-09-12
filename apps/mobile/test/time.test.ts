import { describe, expect, it } from 'vitest'
import {
  atTimeOnDay,
  daysFromNow,
  endOfDayFromNow,
  formatDue,
  formatDueAt,
  formatReminderAt,
  formatTime,
  fromDatetimeLocalValue,
  greetingForHour,
  isDueToday,
  isOverdue,
  isTomorrow,
  isUpcoming,
  relativeTime,
  startOfDay,
  toDatetimeLocalValue,
} from '@kosh/shared'

const REF = new Date(2026, 8, 11, 12, 0, 0)

function iso(y: number, mo: number, d: number, h = 0, mi = 0, s = 0): string {
  return new Date(y, mo - 1, d, h, mi, s).toISOString()
}

describe('time utils', () => {
  it('startOfDay zeroes the clock', () => {
    const d = startOfDay(REF)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getSeconds()).toBe(0)
  })

  it('isDueToday matches same calendar day', () => {
    expect(isDueToday(iso(2026, 9, 11, 0, 0), REF)).toBe(true)
    expect(isDueToday(iso(2026, 9, 11, 23, 0), REF)).toBe(true)
    expect(isDueToday(iso(2026, 9, 10, 23, 0), REF)).toBe(false)
  })

  it('isTomorrow matches next calendar day', () => {
    expect(isTomorrow(iso(2026, 9, 12, 10, 0), REF)).toBe(true)
    expect(isTomorrow(iso(2026, 9, 11, 10, 0), REF)).toBe(false)
  })

  it('isOverdue is time-based: only when the due time has passed', () => {
    expect(isOverdue(iso(2026, 9, 10, 23, 59, 59), REF)).toBe(true)
    expect(isOverdue(iso(2026, 9, 11, 11, 59, 59), REF)).toBe(true)
    expect(isOverdue(iso(2026, 9, 11, 12, 0, 0), REF)).toBe(false)
    expect(isOverdue(iso(2026, 9, 11, 13, 0), REF)).toBe(false)
    expect(isOverdue(iso(2026, 9, 12, 0, 0), REF)).toBe(false)
  })

  it('isUpcoming is strictly after today', () => {
    expect(isUpcoming(iso(2026, 9, 12, 0, 0), REF)).toBe(true)
    expect(isUpcoming(iso(2026, 9, 11, 23, 59, 59), REF)).toBe(false)
  })

  it('relativeTime formats recent, hours and days', () => {
    expect(relativeTime(iso(2026, 9, 11, 11, 59, 30), REF)).toBe('Just now')
    expect(relativeTime(iso(2026, 9, 11, 11, 55, 0), REF)).toBe('5m ago')
    expect(relativeTime(iso(2026, 9, 11, 10, 0, 0), REF)).toBe('2h ago')
    expect(relativeTime(iso(2026, 9, 10, 10, 0, 0), REF)).toBe('Yesterday')
    expect(relativeTime(iso(2026, 9, 8, 10, 0, 0), REF)).toBe('3d ago')
  })

  it('formatDue labels today, tomorrow, overdue and weekdays', () => {
    expect(formatDue(iso(2026, 9, 11, 15, 0), REF)).toBe('Today')
    expect(formatDue(iso(2026, 9, 12, 15, 0), REF)).toBe('Tomorrow')
    expect(formatDue(iso(2026, 9, 9, 15, 0), REF)).toBe('Overdue')
    expect(formatDue(iso(2026, 9, 14, 15, 0), REF)).toMatch(/^[A-Za-z]{3}$/)
  })

  it('formatTime and formatDueAt render the local time of day', () => {
    const at = iso(2026, 9, 11, 18, 0)
    expect(formatTime(at)).toMatch(/\d{1,2}:\d{2}/)
    expect(formatDueAt(at, REF)).toBe(`Today, ${formatTime(at)}`)
    expect(formatDueAt(iso(2026, 9, 12, 10, 0), REF)).toBe(
      `Tomorrow, ${formatTime(iso(2026, 9, 12, 10, 0))}`,
    )
    expect(formatReminderAt(at, REF)).toBe(`Today, ${formatTime(at)}`)
  })

  it('daysFromNow / endOfDayFromNow produce the right calendar days', () => {
    expect(isDueToday(daysFromNow(0, REF), REF)).toBe(true)
    expect(isTomorrow(daysFromNow(1, REF), REF)).toBe(true)
    expect(isOverdue(daysFromNow(-1, REF), REF)).toBe(true)
    expect(isDueToday(endOfDayFromNow(0, REF), REF)).toBe(true)
    expect(isTomorrow(endOfDayFromNow(1, REF), REF)).toBe(true)
  })

  it('atTimeOnDay yields a specific local time', () => {
    const d = new Date(atTimeOnDay(1, 9, 30, REF))
    expect(d.getDate()).toBe(12)
    expect(d.getHours()).toBe(9)
    expect(d.getMinutes()).toBe(30)
  })

  it('datetime-local value round-trips through local time', () => {
    const original = new Date(2026, 8, 11, 18, 30, 0).toISOString()
    const roundTripped = fromDatetimeLocalValue(toDatetimeLocalValue(original))
    expect(new Date(roundTripped).getHours()).toBe(18)
    expect(new Date(roundTripped).getMinutes()).toBe(30)
  })

  it('greetingForHour picks the right greeting', () => {
    expect(greetingForHour(6)).toBe('Good morning')
    expect(greetingForHour(11)).toBe('Good morning')
    expect(greetingForHour(12)).toBe('Good afternoon')
    expect(greetingForHour(16)).toBe('Good afternoon')
    expect(greetingForHour(17)).toBe('Good evening')
    expect(greetingForHour(3)).toBe('Good evening')
  })
})
