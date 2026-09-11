import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { ITEM_TYPES, typeLabel, useItems, useServerSearch } from '@kosh/shared'
import type { SearchTypeFilter } from '@kosh/shared'
import { colors, radius, spacing } from '../theme'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'

const FILTERS: SearchTypeFilter[] = ['all', ...ITEM_TYPES]

export function SearchScreen() {
  const { toggleDone } = useItems()
  const { openItem } = useNav()
  const {
    query,
    setQuery,
    filter,
    setFilter,
    results,
    loading,
    error,
    searched,
    clear,
    patchResult,
  } = useServerSearch()

  const handleToggleDone = (id: string) => {
    const current = results.find((i) => i.id === id)
    if (!current) return
    const next = current.status === 'done' ? 'active' : 'done'
    patchResult(id, {
      status: next,
      doneAt: next === 'done' ? new Date().toISOString() : null,
    })
    void toggleDone(id)
  }

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
            onPress={clear}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.clear}
          >
            <Icon name="x" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
        contentContainerStyle={styles.filtersInner}
      >
        {FILTERS.map((f) => {
          const active = filter === f
          const label = f === 'all' ? 'All' : typeLabel[f]
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Filter by ${label}`}
              style={[styles.filter, active && styles.filterActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          )
        })}
      </ScrollView>

      {query.trim() === '' ? (
        <EmptyState
          icon="search"
          title="Search Kosh"
          message="Search your tasks, notes, ideas, and everything you've captured."
        />
      ) : error ? (
        <EmptyState icon="search" title="Search failed" message={error} />
      ) : loading && results.length === 0 ? (
        <EmptyState icon="search" title="Searching…" message="" />
      ) : searched && results.length === 0 ? (
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
            onToggleDone={result.type === 'task' ? () => handleToggleDone(result.id) : undefined}
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
    marginBottom: spacing.md,
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
  filters: {
    flexGrow: 0,
    marginBottom: spacing.lg,
  },
  filtersInner: {
    gap: spacing.sm,
  },
  filter: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  filterText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.accent,
    fontWeight: '600',
  },
})
