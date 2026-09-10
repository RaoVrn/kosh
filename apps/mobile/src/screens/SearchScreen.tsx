import { useMemo, useState } from 'react'
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'
import { searchItems } from '@kosh/shared'

export function SearchScreen() {
  const { items, toggleDone } = useItems()
  const { openItem } = useNav()
  const [query, setQuery] = useState('')

  const results = useMemo(() => searchItems(items, query), [items, query])

  return (
    <Content>
      <PageHeader title="Search" subtitle="Find anything you've captured." />

      <View style={styles.searchBar}>
        <Icon name="search" size={18} color={colors.textFaint} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search tasks, notes, ideas…"
          placeholderTextColor={colors.textFaint}
          autoFocus={Platform.OS === 'web'}
          accessibilityLabel="Search"
        />
        {query.length > 0 ? (
          <Pressable
            onPress={() => setQuery('')}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.clear}
          >
            <Icon name="x" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {query.trim() === '' ? (
        <EmptyState
          icon="search"
          title="Search everything"
          message="Find tasks, notes, ideas, learning items and links."
        />
      ) : results.length === 0 ? (
        <EmptyState
          icon="search"
          title="No results"
          message={`Nothing matches "${query.trim()}".`}
        />
      ) : (
        results.map((result) => (
          <ItemCard
            key={result.id}
            item={result}
            onPress={() => openItem(result.id)}
            onToggleDone={result.type === 'task' ? () => toggleDone(result.id) : undefined}
          />
        ))
      )}
    </Content>
  )
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  clear: {
    padding: 4,
  },
})
