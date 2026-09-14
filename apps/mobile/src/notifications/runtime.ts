import { Platform } from 'react-native'
import { isRunningInExpoGo } from 'expo'

/**
 * Returns whether the app is currently running inside Expo Go.
 * This is the official Expo runtime signal (SDK 43+) and is safe to call on
 * every platform — it never touches expo-notifications.
 */
export function isExpoGo(): boolean {
  try {
    return isRunningInExpoGo()
  } catch {
    return false
  }
}

/**
 * Decides whether it is safe to EVALUATE the expo-notifications module on the
 * current runtime.
 *
 * expo-notifications evaluates a side-effect module
 * (DevicePushTokenAutoRegistration.fx) that registers a remote push token
 * listener at import time. On Android inside Expo Go (SDK 53+) that path
 * throws, so the module must never be imported there — even a dynamic
 * `import()` wrapped in try/catch is too late, because module evaluation is
 * what crashes.
 *
 * Matrix:
 * - Web                    → false (native module; never evaluated)
 * - Android + Expo Go      → false (unsupported remote-push path)
 * - Android native build   → true
 * - iOS (Expo Go or build) → true (the unsupported path only throws on
 *   Android; local notifications remain available on iOS)
 */
export function canLoadExpoNotifications(
  platform: string = Platform.OS,
  expoGo: boolean = isExpoGo(),
): boolean {
  if (platform === 'web') return false
  if (platform === 'android' && expoGo) return false
  return true
}
