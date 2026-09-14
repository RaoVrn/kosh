import { useEffect, useMemo, useState } from 'react'
import { FlatList, Keyboard, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import {
  ITEM_TYPES,
  addRecentSearch,
  clearRecentSearches,
  getRecentSearches,
  typeLabel,
  useItems,
  useProjects,
  useServerSearch,
} from '@kosh/shared'
import type { ItemType, SearchTypeFilter } from '@kosh/shared'
import { colors, radius, spacing } from '../theme'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { EmptyState } from '../components/EmptyState'

type StatusFilter = 'all' | 'inbox' | 'active' | 'done' | 'archived'

export function SearchScreen() {
  const { toggleDone } = useItems()
  const { openItem } = useNav()
  const { projects } = useProjects()
  const { items } = useItems()
  const [input, setInput] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [hasAttachmentFilter, setHasAttachmentFilter] = useState(false)
  const [recent, setRecent] = useState<string[]>(() => getRecentSearches())

  const hook = useServerSearch()

  const effectiveQuery = useMemo(() => {
    const parts: string[] = []
    if (input.trim()) parts.push(input.trim())
    if (hook.filter !== 'all') parts.push(`type:${hook.filter}`)
    if (statusFilter !== 'all') parts.push(`status:${statusFilter}`)
    if (hasAttachmentFilter) parts.push('has:attachment')
    return parts.join(' ')
  }, [input, hook.filter, statusFilter, hasAttachmentFilter])

  useEffect(() => {
    hook.setQuery(effectiveQuery)
  }, [effectiveQuery])

  const commitSearch = (q: string) => {
    setInput(q)
    setRecent(addRecentSearch(q))
    Keyboard.dismiss()
  }

  const handleToggleDone = (id: string) => {
    const current = hook.results.find((i) => i.id === id)
    if (!current) return
    const next = current.status === 'done' ? 'active' : 'done'
    hook.patchResult(id, {
      status: next,
      doneAt: next === 'done' ? new Date().toISOString() : null,
    })
    void toggleDone(id)
  }

  const handleOpen = (id: string) => {
    if (input.trim()) setRecent(addRecentSearch(effectiveQuery))
    openItem(id)
  }

  return (
    <Content>
      <PageHeader
        title="Search"
        subtitle="Find anything you've captured."
        count={hook.searched && hook.total > 0 ? hook.total : undefined}
      />

      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={() => input.trim() && setRecent(addRecentSearch(effectiveQuery))}
          placeholder="Search tasks, notes, ideas…"
          placeholderTextColor={colors.textFaint}
          accessibilityLabel="Search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        {input ? (
          <Pressable
            onPress={() => {
              hook.clear()
              setInput('')
              setStatusFilter('all')
              setHasAttachmentFilter(false)
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            style={styles.clearButton}
          >
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.chipRow}>
        <Chip label="All" active={hook.filter === 'all'} onPress={() => hook.setFilter('all')} />
        {ITEM_TYPES.map((t) => (
          <Chip
            key={t}
            label={typeLabel[t]}
            active={hook.filter === t}
            onPress={() => hook.setFilter(t as SearchTypeFilter)}
          />
        ))}
      </View>
      <View style={styles.chipRow}>
        <Chip
          label="Inbox"
          active={statusFilter === 'inbox'}
          onPress={() => setStatusFilter('inbox')}
        />
        <Chip
          label="Active"
          active={statusFilter === 'active'}
          onPress={() => setStatusFilter('active')}
        />
        <Chip
          label="Done"
          active={statusFilter === 'done'}
          onPress={() => setStatusFilter('done')}
        />
        <Chip
          label="Archived"
          active={statusFilter === 'archived'}
          onPress={() => setStatusFilter('archived')}
        />
        <Chip
          label="With attachments"
          active={hasAttachmentFilter}
          onPress={() => setHasAttachmentFilter((v) => !v)}
        />
      </View>

      {recent.length > 0 && !input ? (
        <View style={styles.recentRow}>
          <Text style={styles.recentLabel}>Recent</Text>
          {recent.map((r) => (
            <Chip key={r} label={r} active={false} onPress={() => commitSearch(r)} />
          ))}
          <Pressable
            onPress={() => {
              clearRecentSearches()
              setRecent([])
            }}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Clear recent searches"
          >
            <Text style={styles.recentClear}>Clear</Text>
          </Pressable>
        </View>
      ) : null}

      {hook.loading ? (
        <Text style={styles.stateText}>Searching…</Text>
      ) : hook.error ? (
        <Text style={[styles.stateText, styles.errorText]}>{hook.error}</Text>
      ) : !hook.searched ? null : hook.results.length === 0 ? (
        <EmptyState
          icon="search"
          title={`No results for "${input.trim()}"`}
          message="Try fewer words, different spelling, or removing filters."
        />
      ) : (
        <FlatList
          data={hook.results}
          keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <ItemCard
              item={item}
              onPress={() => handleOpen(item.id)}
              onToggleDone={item.type === 'task' ? () => handleToggleDone(item.id) : undefined}
            />
          )}
          ListFooterComponent={
            hook.hasMore ? (
              <Pressable
                onPress={hook.loadMore}
                disabled={hook.loadingMore}
                accessibilityRole="button"
                accessibilityLabel="Load more results"
                style={styles.loadMore}
              >
                <Text style={styles.loadMoreText}>
                  {hook.loadingMore ? 'Loading…' : 'Load more'}
                </Text>
              </Pressable>
            ) : null
          }
        />
      )}
    </Content>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    paddingVertical: spacing.md,
  },
  clearButton: {
    padding: 4,
  },
  clearText: {
    color: colors.textMuted,
    fontSize: 15,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.accent,
  },
  recentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  recentLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  recentClear: {
    color: colors.textFaint,
    fontSize: 12,
    textDecorationLine: 'underline',
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  errorText: {
    color: colors.warning,
  },
  loadMore: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  loadMoreText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
})
