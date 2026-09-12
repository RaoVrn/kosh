export function canUseLocalNotifications(platform: string): boolean {
  return platform !== 'web'
}
