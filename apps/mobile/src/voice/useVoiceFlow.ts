import { useEffect, useReducer, useRef, useState } from 'react'
import { errorMessage, useItems, useSmartCapture } from '@kosh/shared'
import type { VoiceRecorder } from './types'
import { initialVoiceFlowState, voiceFlowReducer } from './flow'
import type { VoiceFlowState } from './flow'

export interface UseVoiceFlow {
  state: VoiceFlowState
  transcript: string
  setTranscript: (text: string) => void
  smartResult: ReturnType<typeof useSmartCapture>['result']
  start: () => void
  stop: () => void
  cancel: () => void
  understand: () => void
  saveToInbox: () => void
  retry: () => void
}

export function useVoiceFlow(recorder: VoiceRecorder, onSaved: () => void): UseVoiceFlow {
  const { addItem, transcribe } = useItems()
  const smart = useSmartCapture()
  const [state, dispatch] = useReducer(voiceFlowReducer, initialVoiceFlowState)
  const [transcript, setTranscript] = useState('')
  const busyRef = useRef(false)

  useEffect(() => {
    const current = recorder
    return () => {
      current.dispose()
    }
  }, [recorder])

  useEffect(() => {
    return smart.reset
  }, [])

  const start = () => {
    if (busyRef.current || state.stage === 'recording') return
    busyRef.current = true
    dispatch({ type: 'request' })
    void (async () => {
      try {
        console.log('[voice] requesting microphone permission')
        const granted = await recorder.requestPermission()
        if (!granted) {
          dispatch({ type: 'permissionDenied', error: 'Microphone permission was denied.' })
          return
        }
        dispatch({ type: 'preparing' })
        console.log('[voice] preparing recorder')
        try {
          await recorder.start()
        } catch (err) {
          console.log('[voice] recorder failed to start', err instanceof Error ? err.message : err)
          dispatch({
            type: 'prepareFailed',
            error: errorMessage(err, 'Could not start recording.'),
          })
          return
        }
        dispatch({ type: 'recordingStarted' })
        console.log('[voice] recording started')
      } catch (err) {
        dispatch({
          type: 'permissionDenied',
          error: errorMessage(err, 'Microphone is unavailable.'),
        })
      } finally {
        busyRef.current = false
      }
    })()
  }

  const stop = () => {
    if (busyRef.current || state.stage !== 'recording') return
    busyRef.current = true
    dispatch({ type: 'stopping' })
    void (async () => {
      let recording: Awaited<ReturnType<VoiceRecorder['stop']>>
      try {
        console.log('[voice] stopping recorder')
        recording = await recorder.stop()
      } catch (err) {
        console.log('[voice] recorder stop failed', err instanceof Error ? err.message : err)
        dispatch({ type: 'recordingFailed', error: errorMessage(err, 'Recording failed.') })
        busyRef.current = false
        return
      }
      dispatch({ type: 'uploading' })
      try {
        console.log(`[voice] transcription: uploading (${recording.mime})`)
        dispatch({ type: 'transcribing' })
        const text = await transcribe(recording)
        console.log('[voice] transcription: success')
        setTranscript(text)
        dispatch({ type: 'transcribed' })
      } catch (err) {
        console.log('[voice] transcription failed', err instanceof Error ? err.message : err)
        dispatch({
          type: 'transcribeFailed',
          error: errorMessage(err, "Your recording couldn't be transcribed. Try again."),
        })
      } finally {
        busyRef.current = false
      }
    })()
  }

  const cancel = () => {
    void recorder.cancel().catch(() => {})
    dispatch({ type: 'reset' })
  }

  const understand = () => {
    if (state.stage !== 'transcriptReady') return
    dispatch({ type: 'interpreting' })
    console.log('[voice] sending transcript to Smart Capture')
    void smart.interpretText(transcript).then((result) => {
      if (!result) dispatch({ type: 'interpretFailed' })
    })
  }

  const saveToInbox = async () => {
    await addItem({ title: transcript })
    onSaved()
  }

  const retry = () => {
    dispatch({ type: 'reset' })
  }

  return {
    state,
    transcript,
    setTranscript,
    smartResult: smart.result,
    start,
    stop,
    cancel,
    understand,
    saveToInbox,
    retry,
  }
}
