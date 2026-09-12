import { useMemo } from 'react'
import { Platform } from 'react-native'
import type { VoiceRecorder } from './types'
import { isWebPlatform } from './platform'
import { createWebRecorder } from './webRecorder'
import { useNativeRecorder } from './nativeRecorder'

export function useRecorder(): VoiceRecorder {
  if (isWebPlatform(Platform.OS)) {
    return useMemo(() => createWebRecorder(), [])
  }
  return useNativeRecorder()
}
