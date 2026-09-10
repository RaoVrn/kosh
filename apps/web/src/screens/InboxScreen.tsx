import { useEffect, useMemo, useRef, useState } from 'react'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { PageHeader } from '../components/PageHeader'
import { CaptureInput } from '../components/CaptureInput'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'

export function InboxScreen() {
  const { items, addItem, toggleDone } = useItems()
  const { openItem, captureFocusRequest } = useNav()
  const inputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)

  const inboxItems = useMemo(
    () =>
      items
        .filter((i) => i.status === 'inbox')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items],
  )

  useEffect(() => {
    if (captureFocusRequest > 0) inputRef.current?.focus()
  }, [captureFocusRequest])

  useEffect(() => {
    if (!feedback) return
    const timer = setTimeout(() => setFeedback(null), 1800)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleSubmit = (text: string) => {
    const item = addItem({ title: text })
    setHighlightId(item.id)
    setFeedback('Added to inbox')
    setTimeout(() => setHighlightId(null), 1800)
  }

  const handleMic = () => {
    setFeedback('Voice capture is coming soon')
  }

  return (
    <div className="content">
      <PageHeader title="Inbox" subtitle="Everything lands here first." count={inboxItems.length} />
      <CaptureInput onSubmit={handleSubmit} onMicPress={handleMic} innerRef={inputRef} />
      {feedback ? <p className="feedback">{feedback}</p> : null}

      {inboxItems.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Nothing here yet."
          message="Capture something and Kosh will keep it safe."
        />
      ) : (
        inboxItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            highlighted={item.id === highlightId}
            onPress={() => openItem(item.id)}
            onToggleDone={item.type === 'task' ? () => toggleDone(item.id) : undefined}
          />
        ))
      )}
    </div>
  )
}
