import { useCallback, useState } from 'react'
import type { CaptureResult } from '../index'
import { errorMessage } from '../api/itemsApi'
import { useItems } from './ItemsContext'

export type SmartCaptureStatus = 'idle' | 'interpreting' | 'ready' | 'error'

export interface UseSmartCapture {
  status: SmartCaptureStatus
  result: CaptureResult | null
  error: string | null
  interpretText: (text: string) => Promise<CaptureResult | null>
  reset: () => void
}

export function useSmartCapture(): UseSmartCapture {
  const { interpret } = useItems()
  const [status, setStatus] = useState<SmartCaptureStatus>('idle')
  const [result, setResult] = useState<CaptureResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const interpretText = useCallback(
    async (text: string) => {
      setStatus('interpreting')
      setError(null)
      setResult(null)
      try {
        const timezone =
          typeof Intl !== 'undefined' && Intl.DateTimeFormat
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined
        const currentTime = new Date().toISOString()
        const capture = await interpret(text, timezone, currentTime)
        setResult(capture)
        setStatus('ready')
        return capture
      } catch (err) {
        setError(errorMessage(err, "Kosh couldn't interpret this right now. Your capture is safe."))
        setStatus('error')
        return null
      }
    },
    [interpret],
  )

  const reset = useCallback(() => {
    setStatus('idle')
    setResult(null)
    setError(null)
  }, [])

  return { status, result, error, interpretText, reset }
}
