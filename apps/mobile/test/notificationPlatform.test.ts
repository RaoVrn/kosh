import { describe, expect, it } from 'vitest'
import { canUseLocalNotifications } from '../src/notifications/platform'

describe('local notification platform guard', () => {
  it('never enables local notification APIs on web', () => {
    expect(canUseLocalNotifications('web')).toBe(false)
  })

  it('keeps native platforms enabled', () => {
    expect(canUseLocalNotifications('ios')).toBe(true)
    expect(canUseLocalNotifications('android')).toBe(true)
  })
})
