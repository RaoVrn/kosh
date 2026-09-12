import { describe, expect, it, vi } from 'vitest'
import { canUseLocalNotifications } from '../src/notifications/platform'

vi.mock('react-native', () => ({ Platform: { OS: 'web' } }))

const nativeCalls: string[] = []
vi.mock('expo-notifications', () => ({
  setNotificationHandler: () => nativeCalls.push('setNotificationHandler'),
  getPermissionsAsync: () => {
    nativeCalls.push('getPermissionsAsync')
    return Promise.resolve({ granted: true })
  },
  requestPermissionsAsync: () => {
    nativeCalls.push('requestPermissionsAsync')
    return Promise.resolve({ granted: true })
  },
  scheduleNotificationAsync: () => {
    nativeCalls.push('scheduleNotificationAsync')
    return Promise.resolve('id')
  },
  getAllScheduledNotificationsAsync: () => {
    nativeCalls.push('getAllScheduledNotificationsAsync')
    return Promise.resolve([])
  },
  cancelScheduledNotificationAsync: () => {
    nativeCalls.push('cancelScheduledNotificationAsync')
    return Promise.resolve()
  },
  SchedulableTriggerInputTypes: { DATE: 'date' },
}))

describe('notification platform guards', () => {
  it('disables native local notifications on web', () => {
    expect(canUseLocalNotifications('web')).toBe(false)
    expect(canUseLocalNotifications('ios')).toBe(true)
    expect(canUseLocalNotifications('android')).toBe(true)
  })

  it('schedule.ts never calls native-only APIs on web', async () => {
    const { syncTaskReminderNotifications } = await import('../src/notifications/schedule')
    const plans = [{ itemId: 'x', title: 't', body: 'b', at: new Date() }]
    const result = await syncTaskReminderNotifications(plans)

    expect(result).toBe(false)
    expect(nativeCalls).toHaveLength(0)
  })
})
