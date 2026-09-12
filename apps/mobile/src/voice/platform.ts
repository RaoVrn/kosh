export function isWebPlatform(platform: string): boolean {
  return platform === 'web'
}

interface NavigatorLike {
  mediaDevices?: { getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream> }
}

export function canUseMediaRecorder(
  getNavigator: () => NavigatorLike | undefined = () =>
    typeof navigator !== 'undefined' ? navigator : undefined,
): boolean {
  const nav = getNavigator()
  if (!nav?.mediaDevices?.getUserMedia) return false
  return typeof MediaRecorder !== 'undefined'
}