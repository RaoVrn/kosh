import { useEffect } from 'react'
import { useItems, useSmartCapture } from '@kosh/shared'
import { Icon } from './Icon'
import { CapturePreview } from './CapturePreview'

interface SmartCaptureModalProps {
  text: string
  onClose: () => void
  onSaved: () => void
}

export function SmartCaptureModal({ text, onClose, onSaved }: SmartCaptureModalProps) {
  const { addItem } = useItems()
  const { status, result, error, interpretText, reset } = useSmartCapture()

  useEffect(() => {
    void interpretText(text)
    return reset
  }, [])

  const saveToInbox = async () => {
    await addItem({ title: text })
    onSaved()
  }

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label="Smart capture">
        {status === 'interpreting' ? (
          <div className="smart-state">
            <Icon name="zap" size={26} color="var(--accent)" />
            <p className="smart-state-title">Kosh is understanding…</p>
            <p className="smart-state-sub">Your capture is safe.</p>
          </div>
        ) : status === 'error' ? (
          <div className="smart-state">
            <Icon name="alert-circle" size={26} color="var(--warning)" />
            <p className="smart-state-title">Couldn't interpret this right now.</p>
            <p className="smart-state-sub">{error}</p>
            <p className="smart-state-original">"{text}"</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary btn-block"
                onClick={() => void saveToInbox()}
              >
                Save to Inbox
              </button>
              <button type="button" className="btn-secondary btn-block" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        ) : result ? (
          <CapturePreview
            result={result}
            originalText={text}
            onSave={onSaved}
            onCancel={onClose}
            onInbox={() => void saveToInbox()}
          />
        ) : null}
      </div>
    </div>
  )
}
