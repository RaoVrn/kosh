import { beforeEach, describe, expect, it, vi } from 'vitest'

// 'expo' is imported by the runtime detection module — always available in
// the app, mocked here so unit tests never evaluate the real package.
vi.mock('expo', () => ({ isRunningInExpoGo: () => false }))

const nativeCalls: string[] = []
let importAttempted = false

function makeModule() {
  return {
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
  }
}

function makeThrowingModule() {
  return new Proxy(makeModule(), {
    get() {
      throw new Error(
        'expo-notifications: Android Push notifications (remote notifications) functionality provided by expo-notifications was removed from Expo Go with the release of SDK 53.',
      )
    },
  })
}

function mockPlatform(os: 'web' | 'android' | 'ios') {
  vi.doMock('react-native', () => ({ Platform: { OS: os } }))
}

function mockExpoGo(expoGo: boolean) {
  vi.doMock('expo', () => ({ isRunningInExpoGo: () => expoGo }))
}

describe('notification runtime detection (Expo Go safety)', () => {
  beforeEach(() => {
    nativeCalls.length = 0
    importAttempted = false
    vi.resetModules()
  })

  it('canLoadExpoNotifications follows the runtime matrix', async () => {
    vi.doMock('react-native', () => ({ Platform: { OS: 'ios' } }))
    vi.doMock('expo', () => ({ isRunningInExpoGo: () => false }))
    const { canLoadExpoNotifications } = await import('../src/notifications/runtime')
    expect(canLoadExpoNotifications('web', false)).toBe(false)
    expect(canLoadExpoNotifications('web', true)).toBe(false)
    expect(canLoadExpoNotifications('android', true)).toBe(false)
    expect(canLoadExpoNotifications('android', false)).toBe(true)
    expect(canLoadExpoNotifications('ios', false)).toBe(true)
    expect(canLoadExpoNotifications('ios', true)).toBe(true)
  })

  it('ANDROID EXPO GO: expo-notifications is NEVER evaluated and setup is silent', async () => {
    mockPlatform('android')
    mockExpoGo(true)
    vi.doMock('expo-notifications', () => {
      importAttempted = true
      return makeThrowingModule()
    })

    const { setupLocalNotificationHandler, syncTaskReminderNotifications } =
      await import('../src/notifications/schedule')

    await expect(setupLocalNotificationHandler()).resolves.toBeUndefined()
    const result = await syncTaskReminderNotifications([
      { itemId: 'x', title: 't', body: 'b', at: new Date() },
    ])

    expect(result).toBe(false)
    // The module must NOT have been imported at all — evaluation is what
    // crashes Expo Go, so the import must never be attempted.
    expect(importAttempted).toBe(false)
    expect(nativeCalls).toHaveLength(0)
  })

  it('WEB: expo-notifications is never imported and no calls are made', async () => {
    mockPlatform('web')
    mockExpoGo(false)
    vi.doMock('expo-notifications', () => {
      importAttempted = true
      return makeThrowingModule()
    })

    const { setupLocalNotificationHandler, syncTaskReminderNotifications } =
      await import('../src/notifications/schedule')
    await setupLocalNotificationHandler()
    const result = await syncTaskReminderNotifications([
      { itemId: 'x', title: 't', body: 'b', at: new Date() },
    ])

    expect(result).toBe(false)
    expect(importAttempted).toBe(false)
    expect(nativeCalls).toHaveLength(0)
  })

  it('SUPPORTED NATIVE (android build): module loads and local scheduling works', async () => {
    mockPlatform('android')
    mockExpoGo(false)
    vi.doMock('expo-notifications', () => {
      importAttempted = true
      return makeModule()
    })

    const { setupLocalNotificationHandler, syncTaskReminderNotifications } =
      await import('../src/notifications/schedule')
    await setupLocalNotificationHandler()
    const result = await syncTaskReminderNotifications([
      { itemId: 'x', title: 't', body: 'b', at: new Date() },
    ])

    expect(result).toBe(true)
    expect(importAttempted).toBe(true)
    expect(nativeCalls).toContain('setNotificationHandler')
    expect(nativeCalls).toContain('scheduleNotificationAsync')
    expect(nativeCalls).toContain('getAllScheduledNotificationsAsync')
    // No remote push APIs are ever used.
    expect(nativeCalls.some((c) => c.includes('PushToken') || c.includes('pushToken'))).toBe(false)
  })

  it('SUPPORTED NATIVE with a module that fails at load: degrades without crashing', async () => {
    mockPlatform('ios')
    mockExpoGo(false)
    vi.doMock('expo-notifications', () => {
      importAttempted = true
      return makeThrowingModule()
    })

    const { setupLocalNotificationHandler, syncTaskReminderNotifications } =
      await import('../src/notifications/schedule')
    await expect(setupLocalNotificationHandler()).resolves.toBeUndefined()
    const result = await syncTaskReminderNotifications([
      { itemId: 'x', title: 't', body: 'b', at: new Date() },
    ])
    expect(result).toBe(false)
  })
})
