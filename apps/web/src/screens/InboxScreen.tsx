import { useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage, useItems } from '@kosh/shared'
import type { Item } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { PageHeader } from '../components/PageHeader'
import { CaptureInput } from '../components/CaptureInput'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { SmartCaptureModal } from '../components/SmartCaptureModal'
import { VoiceCaptureModal } from '../components/VoiceCaptureModal'
import { InboxProcessModal } from '../components/InboxProcessModal'

interface Feedback {
  message: string
  isError: boolean
}

export function InboxScreen() {
  const { items, addItem, toggleDone, updateItem, refresh } = useItems()
  const { openItem, captureFocusRequest } = useNav()
  const [processingItem, setProcessingItem] = useState<Item | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [highlightId, setHighlightId] = useState<string | null>(null)
  const [smartText, setSmartText] = useState<string | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)

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
    const timer = setTimeout(() => setFeedback(null), 2200)
    return () => clearTimeout(timer)
  }, [feedback])

  const handleSubmit = async (text: string): Promise<boolean> => {
    try {
      const item = await addItem({ title: text })
      setHighlightId(item.id)
      setFeedback({ message: 'Added to inbox', isError: false })
      setTimeout(() => setHighlightId(null), 1800)
      return true
    } catch (err) {
      setFeedback({
        message: errorMessage(err, 'Could not add — is the API running?'),
        isError: true,
      })
      return false
    }
  }

  const handleSaved = () => {
    setSmartText(null)
    setVoiceOpen(false)
    setFeedback({ message: 'Added', isError: false })
  }

  const activateItem = (item: Item) => {
    void updateItem(item.id, { status: 'active' })
  }

  const archiveItem = (item: Item) => {
    void updateItem(item.id, { status: 'archived' })
  }

  const convertToTask = (item: Item) => {
    void updateItem(item.id, { type: 'task' })
  }

  const openLink = (item: Item) => {
    if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="content">
      <PageHeader title="Inbox" subtitle="Everything lands here first." count={inboxItems.length} />
      <CaptureInput
        onSubmit={handleSubmit}
        onSmartPress={(text) => setSmartText(text)}
        onMicPress={() => setVoiceOpen(true)}
        innerRef={inputRef}
      />
      {feedback ? (
        <p className={feedback.isError ? 'feedback error' : 'feedback'}>{feedback.message}</p>
      ) : null}

      {inboxItems.length === 0 ? (
        <EmptyState
          icon="inbox"
          title="Nothing waiting."
          message="Capture something and it will land here."
        />
      ) : (
        inboxItems.map((item) => (
          <ItemCard
            key={item.id}
            item={item}
            highlighted={item.id === highlightId}
            onPress={() => openItem(item.id)}
            onToggleDone={item.type === 'task' ? () => toggleDone(item.id) : undefined}
            onActivate={() => activateItem(item)}
            onProcess={() => setProcessingItem(item)}
            onArchive={() => archiveItem(item)}
            onConvertToTask={item.type !== 'task' ? () => convertToTask(item) : undefined}
            onOpenLink={item.type === 'link' && item.url ? () => openLink(item) : undefined}
          />
        ))
      )}

      {processingItem ? (
        <InboxProcessModal
          item={processingItem}
          onClose={() => setProcessingItem(null)}
          onDone={() => {
            setProcessingItem(null)
            void refresh()
          }}
        />
      ) : null}

      {smartText !== null ? (
        <SmartCaptureModal
          text={smartText}
          onClose={() => setSmartText(null)}
          onSaved={handleSaved}
        />
      ) : null}
      {voiceOpen ? (
        <VoiceCaptureModal onClose={() => setVoiceOpen(false)} onSaved={handleSaved} />
      ) : null}
    </div>
  )
}
