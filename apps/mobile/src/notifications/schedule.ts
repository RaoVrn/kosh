import type { ScheduledReminderPlan } from './plan'
import { canLoadExpoNotifications } from './runtime'

const PREFIX = 'kosh-reminder-'

type NotificationsModule = typeof import('expo-notifications')

/**
 * Whether this runtime can safely evaluate the expo-notifications module.
 * Computed BEFORE any import so Android Expo Go never evaluates the module
 * (which crashes because its module init touches the removed remote-push
 * path). Detection is runtime-based, not just Platform.OS.
 */
const CAN_LOAD = canLoadExpoNotifications()

let notificationsModule: NotificationsModule | null | undefined
let loading: Promise<NotificationsModule | null> | null = null

/**
 * Loads expo-notifications ONLY on runtimes that support it. On unsupported
 * runtimes (web, Android Expo Go) it returns null WITHOUT ever evaluating the
 * module — the capability check happens before the dynamic import.
 */
async function loadNotificationsModule(): Promise<NotificationsModule | null> {
  if (!CAN_LOAD) return null
  if (notificationsModule !== undefined) return notificationsModule
  if (!loading) {
    loading = import('expo-notifications')
      .then((mod) => {
        notificationsModule = mod as NotificationsModule
        return notificationsModule
      })
      .catch((err) => {
        // Genuine failure on a supported runtime: degrade to unavailable.
        console.warn('[notifications] could not load expo-notifications', err)
        notificationsModule = null
        return notificationsModule
      })
  }
  return loading
}

/**
 * Syncs the locally scheduled reminder notifications with the current plans.
 * Returns false when notifications are unavailable (web, Android Expo Go) so
 * callers degrade gracefully. Unsupported runtimes are SILENT — the known
 * Expo Go limitation is not an application failure.
 */
export async function syncTaskReminderNotifications(
  plans: ScheduledReminderPlan[],
): Promise<boolean> {
  if (!CAN_LOAD) return false

  const Notifications = await loadNotificationsModule()
  if (!Notifications) return false

  try {
    await cancelAllKoshReminders(Notifications)
    if (plans.length === 0) return true

    const permissions = await Notifications.getPermissionsAsync()
    if (!permissions.granted) {
      const requested = await Notifications.requestPermissionsAsync()
      if (!requested.granted) return false
    }

    for (const plan of plans) {
      await Notifications.scheduleNotificationAsync({
        identifier: `${PREFIX}${plan.itemId}`,
        content: { title: plan.title, body: plan.body },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: plan.at,
        },
      })
    }
    return true
  } catch (err) {
    console.warn('[notifications] local notification sync failed', err)
    return false
  }
}

async function cancelAllKoshReminders(Notifications: NotificationsModule): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const toCancel = scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => n.identifier)
  for (const id of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(id)
  }
}

/**
 * Sets up the local-notification presentation handler on supported runtimes.
 * Unsupported runtimes (web, Android Expo Go) return immediately without
 * loading expo-notifications and without logging warnings.
 */
export async function setupLocalNotificationHandler(): Promise<void> {
  if (!CAN_LOAD) return
  const Notifications = await loadNotificationsModule()
  if (!Notifications) return
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    })
  } catch (err) {
    console.warn('[notifications] local notification handler unavailable', err)
  }
}
