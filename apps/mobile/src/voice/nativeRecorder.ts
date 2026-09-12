import { useMemo } from 'react'
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio'
import type { VoiceRecorder, VoiceRecording } from './types'

export function useNativeRecorder(): VoiceRecorder {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const recorderState = useAudioRecorderState(recorder)

  return useMemo<VoiceRecorder>(
    () => ({
      supported: true,
      async requestPermission() {
        const permission = await requestRecordingPermissionsAsync()
        console.log(`[voice] native: permission ${permission.granted ? 'granted' : 'denied'}`)
        return permission.granted
      },
      async start() {
        await recorder.prepareToRecordAsync()
        recorder.record()
        console.log('[voice] native: recorder started')
      },
      async stop() {
        await recorder.stop()
        const uri = recorder.uri
        if (!uri) throw new Error('No recording produced')
        console.log(`[voice] native: recorder stopped (${uri})`)
        const recording: VoiceRecording = { uri, name: 'recording.m4a', mime: 'audio/mp4' }
        return recording
      },
      async cancel() {
        if (recorderState.isRecording) {
          await recorder.stop()
          console.log('[voice] native: cancelled — recording stopped')
        }
      },
      dispose() {
        if (recorderState.isRecording) {
          void recorder.stop().catch(() => {})
        }
      },
    }),
    [recorder, recorderState],
  )
}
