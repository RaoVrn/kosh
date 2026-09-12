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

export function IdeasScreen() {
  const { items } = useItems()
  const { openItem } = useNav()
  const [creating, setCreating] = useState(false)

  const ideas = useMemo(
    () =>
      items
        .filter((i) => i.type === 'idea')
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [items],
  )

  return (
    <Content>
      <PageHeader
        title="Ideas"
        subtitle="Captured before they vanish."
        right={
          <Pressable
            onPress={() => setCreating(true)}
            accessibilityRole="button"
            accessibilityLabel="New idea"
            style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
          >
            <Icon name="plus" size={16} color={colors.background} />
            <Text style={styles.newBtnText}>New idea</Text>
          </Pressable>
        }
      />
      {ideas.length === 0 ? (
        <EmptyState icon="zap" title="No ideas yet" message="The next great idea can start here." />
      ) : (
        ideas.map((idea) => (
          <ItemCard key={idea.id} item={idea} onPress={() => openItem(idea.id)} />
        ))
      )}
      {creating ? <ItemCreateSheet type="idea" onClose={() => setCreating(false)} /> : null}
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
