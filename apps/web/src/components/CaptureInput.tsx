import { useRef, useState } from 'react'
import { Icon } from './Icon'

interface CaptureInputProps {
  innerRef?: React.RefObject<HTMLInputElement | null>
  onSubmit: (text: string) => boolean | Promise<boolean>
  onSmartPress?: (text: string) => void
  onMicPress?: () => void
  placeholder?: string
}

export function CaptureInput({
  innerRef,
  onSubmit,
  onSmartPress,
  onMicPress,
  placeholder = "What's on your mind?",
}: CaptureInputProps) {
  const [text, setText] = useState('')
  const fallbackRef = useRef<HTMLInputElement>(null)
  const inputRef = innerRef ?? fallbackRef
  const canSubmit = text.trim().length > 0

  const handleSubmit = async () => {
    const value = text.trim()
    if (!value) return
    const ok = await onSubmit(value)
    if (ok) setText('')
  }

  return (
    <form
      className="capture"
      onSubmit={(e) => {
        e.preventDefault()
        handleSubmit()
      }}
    >
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={placeholder}
        aria-label="Capture text"
        autoComplete="off"
      />
      <button
        type="button"
        className="icon-btn"
        onClick={onMicPress}
        aria-label="Voice capture"
        title="Voice capture"
      >
        <Icon name="mic" size={18} />
      </button>
      <button
        type="button"
        className="icon-btn"
        onClick={() => onSmartPress?.(text.trim())}
        disabled={!canSubmit}
        aria-label="Smart capture"
        title="Interpret with Kosh"
      >
        <Icon name="zap" size={18} color={canSubmit ? 'var(--accent)' : 'var(--text-faint)'} />
      </button>
      <button type="submit" className="btn-send" disabled={!canSubmit} aria-label="Add to inbox">
        <Icon name="arrow-up" size={18} color="currentColor" />
      </button>
    </form>
  )
}
