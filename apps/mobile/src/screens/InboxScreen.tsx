import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Linking, StyleSheet, Text, View } from 'react-native'
import type { TextInput } from 'react-native'
import { colors, layout, spacing } from '../theme'
import { errorMessage, useItems } from '@kosh/shared'
import type { Item } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { PageHeader } from '../components/PageHeader'
import { CaptureInput } from '../components/CaptureInput'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { SmartCaptureSheet } from '../components/SmartCaptureSheet'
import { VoiceCaptureSheet } from '../components/VoiceCaptureSheet'

interface Feedback {
  message: string
  isError: boolean
}

export function InboxScreen() {
  const { items, addItem, toggleDone, updateItem } = useItems()
  const { openItem, captureFocusRequest } = useNav()
  const inputRef = useRef<TextInput>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    },
    [],
  )

  const showFeedback = (message: string, isError = false) => {
    setFeedback({ message, isError })
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setFeedback(null), 2200)
  }

  const handleSubmit = async (text: string): Promise<boolean> => {
    try {
      const item = await addItem({ title: text })
      setHighlightId(item.id)
      showFeedback('Added to inbox')
      setTimeout(() => setHighlightId(null), 1800)
      return true
    } catch (err) {
      showFeedback(errorMessage(err, 'Could not add — is the API running?'), true)
      return false
    }
  }

  const handleSaved = () => {
    setSmartText(null)
    setVoiceOpen(false)
    showFeedback('Added')
  }

  const processItem = (item: Item) => {
    void updateItem(item.id, { status: 'active' })
  }

  const archiveItem = (item: Item) => {
    void updateItem(item.id, { status: 'archived' })
  }

  const convertToTask = (item: Item) => {
    void updateItem(item.id, { type: 'task' })
  }

  const openLink = (item: Item) => {
    if (item.url) Linking.openURL(item.url)
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <PageHeader
          title="Inbox"
          subtitle="Everything lands here first."
          count={inboxItems.length}
        />
        <CaptureInput
          innerRef={inputRef}
          onSubmit={handleSubmit}
          onSmartPress={(text) => setSmartText(text)}
          onMicPress={() => setVoiceOpen(true)}
        />
        {feedback ? (
          <Text style={[styles.feedback, feedback.isError && styles.feedbackError]}>
            {feedback.message}
          </Text>
        ) : null}
      </View>

      <FlatList
        data={inboxItems}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <ItemCard
            item={item}
            highlighted={item.id === highlightId}
            onPress={() => openItem(item.id)}
            onToggleDone={item.type === 'task' ? () => toggleDone(item.id) : undefined}
            onProcess={() => processItem(item)}
            onArchive={() => archiveItem(item)}
            onConvertToTask={item.type !== 'task' ? () => convertToTask(item) : undefined}
            onOpenLink={item.type === 'link' && item.url ? () => openLink(item) : undefined}
          />
        )}
        contentContainerStyle={styles.listInner}
        ListEmptyComponent={
          <EmptyState
            icon="inbox"
            title="Nothing waiting."
            message="Capture something and it will land here."
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />

      {smartText !== null ? (
        <SmartCaptureSheet
          text={smartText}
          onClose={() => setSmartText(null)}
          onSaved={handleSaved}
        />
      ) : null}
      {voiceOpen ? (
        <VoiceCaptureSheet onClose={() => setVoiceOpen(false)} onSaved={handleSaved} />
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  top: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  listInner: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
    flexGrow: 1,
  },
  feedback: {
    color: colors.success,
    fontSize: 13,
    marginTop: spacing.sm,
    fontWeight: '500',
  },
  feedbackError: {
    color: colors.danger,
  },
})
