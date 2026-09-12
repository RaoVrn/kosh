import { useEffect, useRef, useState } from 'react'
import { errorMessage, useItems, useSmartCapture } from '@kosh/shared'
import { Icon } from './Icon'
import { CapturePreview } from './CapturePreview'

interface VoiceCaptureModalProps {
  onClose: () => void
  onSaved: () => void
}

type Stage = 'idle' | 'recording' | 'transcribing' | 'transcript' | 'interpreting'

export function VoiceCaptureModal({ onClose, onSaved }: VoiceCaptureModalProps) {
  const { addItem, transcribe } = useItems()
  const smart = useSmartCapture()
  const [stage, setStage] = useState<Stage>('idle')
  const [seconds, setSeconds] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const supported =
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices !== 'undefined' &&
    typeof MediaRecorder !== 'undefined'

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current)
      recorderRef.current?.stream?.getTracks().forEach((t) => t.stop())
    },
    [],
  )

  const startRecording = async () => {
    setError(null)
    setSeconds(0)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => stream.getTracks().forEach((t) => t.stop())
      recorderRef.current = recorder
      recorder.start()
      setStage('recording')
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    } catch {
      setError('Microphone access was denied or unavailable.')
    }
  }

  const stopRecording = async () => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    if (timerRef.current) clearInterval(timerRef.current)
    setStage('transcribing')
    await new Promise<void>((resolve) => {
      recorder.onstop = () => {
        recorder.stream.getTracks().forEach((t) => t.stop())
        resolve()
      }
      recorder.stop()
    })
    const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
    try {
      const text = await transcribe({ blob, name: 'recording.webm', mime: 'audio/webm' })
      setTranscript(text)
      setStage('transcript')
    } catch (err) {
      setError(errorMessage(err, "Your recording couldn't be transcribed. Try again."))
      setStage('idle')
    }
  }

  const understand = async () => {
    setStage('interpreting')
    const result = await smart.interpretText(transcript)
    if (!result) setStage('transcript')
  }

  const saveToInbox = async () => {
    await addItem({ title: transcript })
    onSaved()
  }

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Voice capture">
        {!supported ? (
          <div className="smart-state">
            <Icon name="mic" size={26} color="var(--text-faint)" />
            <p className="smart-state-title">Voice capture isn't supported in this browser.</p>
            <p className="smart-state-sub">
              Use a Chromium or Firefox-based browser, or the mobile app.
            </p>
            <button type="button" className="btn-secondary btn-block" onClick={onClose}>
              Close
            </button>
          </div>
        ) : stage === 'idle' ? (
          <div className="smart-state">
            {error ? <p className="smart-state-sub voice-error">{error}</p> : null}
            <button
              type="button"
              className="voice-record-btn"
              onClick={() => void startRecording()}
              aria-label="Start recording"
            >
              <Icon name="mic" size={30} color="var(--bg)" />
            </button>
            <p className="smart-state-title">Tap to record</p>
            <button type="button" className="btn-secondary btn-block" onClick={onClose}>
              Close
            </button>
          </div>
        ) : stage === 'recording' ? (
          <div className="smart-state">
            <div className="voice-record-btn recording" aria-hidden="true">
              <Icon name="mic" size={30} color="var(--bg)" />
            </div>
            <p className="smart-state-title">
              Listening… {String(Math.floor(seconds / 60)).padStart(2, '0')}:
              {String(seconds % 60).padStart(2, '0')}
            </p>
            <button
              type="button"
              className="btn-primary btn-block"
              onClick={() => void stopRecording()}
            >
              Stop
            </button>
            <button type="button" className="btn-secondary btn-block" onClick={onClose}>
              Cancel
            </button>
          </div>
        ) : stage === 'transcribing' ? (
          <div className="smart-state">
            <Icon name="mic" size={26} color="var(--accent)" />
            <p className="smart-state-title">Transcribing…</p>
          </div>
        ) : stage === 'interpreting' ? (
          <div className="smart-state">
            <Icon name="zap" size={26} color="var(--accent)" />
            <p className="smart-state-title">Kosh is understanding…</p>
          </div>
        ) : smart.result ? (
          <CapturePreview
            result={smart.result}
            originalText={transcript}
            onSave={onSaved}
            onCancel={onClose}
            onInbox={() => void saveToInbox()}
          />
        ) : (
          <div className="smart-state">
            <div className="modal-label">You said</div>
            <textarea
              className="modal-body-input"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              aria-label="Transcript"
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary btn-block"
                onClick={() => void understand()}
              >
                Understand with Kosh
              </button>
              <button
                type="button"
                className="btn-secondary btn-block"
                onClick={() => void saveToInbox()}
              >
                Save to Inbox
              </button>
              <button type="button" className="btn-secondary btn-block" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
