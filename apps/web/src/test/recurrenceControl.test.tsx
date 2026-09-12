import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { useState } from 'react'
import type { Recurrence } from '@kosh/shared'
import { RecurrenceControl } from '../../../web/src/components/RecurrenceControl'

afterEach(cleanup)

function Harness({ initial }: { initial?: Recurrence | null }) {
  const [value, setValue] = useState<Recurrence | null>(initial ?? null)
  return <RecurrenceControl value={value} onChange={setValue} />
}

describe('RecurrenceControl (web)', () => {
  it('defaults to Does not repeat', () => {
    render(<Harness />)
    expect(
      screen.getByRole('button', { name: 'Does not repeat' }).getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('selects daily', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Every day' }))
    expect(screen.getByRole('button', { name: 'Every day' }).getAttribute('aria-pressed')).toBe(
      'true',
    )
  })

  it('selects weekly and toggles multiple weekdays', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Every week' }))
    const monday = screen.getByRole('button', { name: /Monday/ })
    expect(monday.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(monday)
    expect(screen.getByRole('button', { name: /Monday/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /Wednesday/ }))
    expect(screen.getByRole('button', { name: /Wednesday/ }).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(screen.getByRole('button', { name: /Monday/ }).getAttribute('aria-pressed')).toBe('true')
    fireEvent.click(screen.getByRole('button', { name: /Monday/ }))
    expect(screen.getByRole('button', { name: /Monday/ }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })

  it('shows weekday buttons only in weekly mode', () => {
    render(<Harness />)
    expect(screen.queryByRole('button', { name: /Monday/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Every week' }))
    expect(screen.getByRole('button', { name: /Monday/ })).toBeTruthy()
  })

  it('selects monthly with a default day of month', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('button', { name: 'Every month' }))
    expect(
      (screen.getByRole('spinbutton', { name: 'Day of month' }) as HTMLInputElement).value,
    ).toBe('15')
  })

  it('edits an existing recurrence and can remove it', () => {
    render(<Harness initial={{ frequency: 'monthly', dayOfMonth: 31 }} />)
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Day of month' }), {
      target: { value: '1' },
    })
    expect(
      (screen.getByRole('spinbutton', { name: 'Day of month' }) as HTMLInputElement).value,
    ).toBe('1')
    fireEvent.click(screen.getByRole('button', { name: 'Does not repeat' }))
    expect(screen.queryByRole('spinbutton', { name: 'Day of month' })).toBeNull()
  })

  it('reflects an existing weekly recurrence with selected days', () => {
    render(<Harness initial={{ frequency: 'weekly', weekdays: [1, 5] }} />)
    expect(screen.getByRole('button', { name: /Monday/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Friday/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole('button', { name: /Wednesday/ }).getAttribute('aria-pressed')).toBe(
      'false',
    )
  })
})
