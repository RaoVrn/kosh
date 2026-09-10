import { useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, StyleSheet, Text, View } from 'react-native'
import type { TextInput } from 'react-native'
import { colors, layout, spacing } from '../theme'
import { useItems } from '../state/ItemsContext'
import { useNav } from '../state/NavContext'
import { PageHeader } from '../components/PageHeader'
import { CaptureInput } from '../components/CaptureInput'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'

export function InboxScreen() {
  const { items, addItem, toggleDone } = useItems()
  const { openItem, captureFocusRequest } = useNav()
  const inputRef = useRef<TextInput>(null)
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
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

  useEffect(
    () => () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    },
    [],
  )

  const showFeedback = (message: string) => {
    setFeedback(message)
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current)
    feedbackTimer.current = setTimeout(() => setFeedback(null), 1800)
  }

  const handleSubmit = (text: string) => {
    const item = addItem({ title: text })
    setHighlightId(item.id)
    showFeedback('Added to inbox')
    setTimeout(() => setHighlightId(null), 1800)
  }

  const handleMic = () => {
    showFeedback('Voice capture is coming soon')
  }

  return (
    <View style={styles.root}>
      <View style={styles.top}>
        <PageHeader
          title="Inbox"
          subtitle="Everything lands here first."
          count={inboxItems.length}
        />
        <CaptureInput innerRef={inputRef} onSubmit={handleSubmit} onMicPress={handleMic} />
        {feedback ? <Text style={styles.feedback}>{feedback}</Text> : null}
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
          />
        )}
        contentContainerStyle={styles.listInner}
        ListEmptyComponent={
          <EmptyState
            icon="inbox"
            title="Nothing here yet."
            message="Capture something and Kosh will keep it safe."
          />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
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
})
