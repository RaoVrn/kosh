import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text } from 'react-native'
import { colors, radius } from '../theme'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { ItemCreateSheet } from '../components/ItemCreateSheet'
import { Icon } from '../components/Icon'

export function NotesScreen() {
  const { items } = useItems()
  const { openItem } = useNav()
  const [creating, setCreating] = useState(false)

  const notes = useMemo(
    () =>
      items
        .filter((i) => i.type === 'note')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [items],
  )

  return (
    <Content>
      <PageHeader
        title="Notes"
        subtitle="Thoughts worth keeping."
        right={
          <Pressable
            onPress={() => setCreating(true)}
            accessibilityRole="button"
            accessibilityLabel="New note"
            style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
          >
            <Icon name="plus" size={16} color={colors.background} />
            <Text style={styles.newBtnText}>New note</Text>
          </Pressable>
        }
      />
      {notes.length === 0 ? (
        <EmptyState
          icon="file-text"
          title="No notes yet"
          message="Capture something worth remembering."
        />
      ) : (
        notes.map((note) => (
          <ItemCard key={note.id} item={note} onPress={() => openItem(note.id)} />
        ))
      )}
      {creating ? <ItemCreateSheet type="note" onClose={() => setCreating(false)} /> : null}
    </Content>
  )
}

const styles = StyleSheet.create({
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  newBtnText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
})
