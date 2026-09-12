import { Platform } from 'react-native'
import * as Notifications from 'expo-notifications'
import type { ScheduledReminderPlan } from './plan'
import { canUseLocalNotifications } from './platform'

const PREFIX = 'kosh-reminder-'

const IS_NATIVE = canUseLocalNotifications(Platform.OS)

if (IS_NATIVE) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  })
}

export async function syncTaskReminderNotifications(
  plans: ScheduledReminderPlan[],
): Promise<boolean> {
  if (!IS_NATIVE) return false

  await cancelAllKoshReminders()
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
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: plan.at },
    })
  }
  return true
}

async function cancelAllKoshReminders(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync()
  const toCancel = scheduled.filter((n) => n.identifier.startsWith(PREFIX)).map((n) => n.identifier)
  for (const id of toCancel) {
    await Notifications.cancelScheduledNotificationAsync(id)
  }
}
