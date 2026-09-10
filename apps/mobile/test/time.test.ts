import { describe, expect, it } from 'vitest'
import {
  daysFromNow,
  formatDue,
  isDueToday,
  isOverdue,
  isTomorrow,
  isUpcoming,
  relativeTime,
  startOfDay,
} from '../src/utils/time'

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

  it('isOverdue compares against start of today', () => {
    expect(isOverdue(iso(2026, 9, 10, 23, 59, 59), REF)).toBe(true)
    expect(isOverdue(iso(2026, 9, 11, 0, 0), REF)).toBe(false)
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

  it('daysFromNow produces ISO strings on the right calendar day', () => {
    expect(isDueToday(daysFromNow(0, REF), REF)).toBe(true)
    expect(isTomorrow(daysFromNow(1, REF), REF)).toBe(true)
    expect(isOverdue(daysFromNow(-1, REF), REF)).toBe(true)
  })
})
