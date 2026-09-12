import { useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { getLearningGroups } from '@kosh/shared'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { ItemCreateSheet } from '../components/ItemCreateSheet'
import { Icon } from '../components/Icon'

export function LearningScreen() {
  const { items } = useItems()
  const { openItem } = useNav()
  const [creating, setCreating] = useState(false)

  const groups = useMemo(() => getLearningGroups(items), [items])

  const sections: { key: string; title: string; items: (typeof groups.highPriority)[number][] }[] =
    [
      { key: 'high', title: 'High priority', items: groups.highPriority },
      { key: 'active', title: 'Active', items: groups.active },
      { key: 'inbox', title: 'Not started', items: groups.notStarted },
      { key: 'done', title: 'Completed', items: groups.completed },
    ]
  const isEmpty = sections.every((s) => s.items.length === 0)

  return (
    <Content>
      <PageHeader
        title="Learning"
        subtitle="Your backlog of things to learn."
        right={
          <Pressable
            onPress={() => setCreating(true)}
            accessibilityRole="button"
            accessibilityLabel="New learning"
            style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
          >
            <Icon name="plus" size={16} color={colors.background} />
            <Text style={styles.newBtnText}>New learning</Text>
          </Pressable>
        }
      />
      {isEmpty ? (
        <EmptyState
          icon="book-open"
          title="No learning items yet."
          message="Add something you want to understand."
        />
      ) : (
        sections.map(
          (section) =>
            section.items.length > 0 && (
              <View key={section.key} style={styles.group}>
                <Text style={styles.groupTitle}>{section.title}</Text>
                {section.items.map((item) => (
                  <ItemCard key={item.id} item={item} onPress={() => openItem(item.id)} />
                ))}
              </View>
            ),
        )
      )}
      {creating ? <ItemCreateSheet type="learning" onClose={() => setCreating(false)} /> : null}
    </Content>
  )
}

const styles = StyleSheet.create({
  group: {
    marginBottom: spacing.xl,
  },
  groupTitle: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
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
