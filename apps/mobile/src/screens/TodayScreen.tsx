import { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { colors, spacing } from '../theme'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { TaskItem } from '../components/TaskItem'
import { EmptyState } from '../components/EmptyState'
import { getTodayGroups } from '@kosh/shared'

export function TodayScreen() {
  const { items, toggleDone } = useItems()
  const { openItem } = useNav()
  const groups = useMemo(() => getTodayGroups(items), [items])

  return (
    <Content>
      <PageHeader title="Today" subtitle="What do I need to do?" />
      {groups.length === 0 ? (
        <EmptyState
          icon="sun"
          title="All clear"
          message="Nothing needs your attention today. Take a breath."
        />
      ) : (
        groups.map((group) => (
          <View key={group.key} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.items.map((task) => (
              <TaskItem
                key={task.id}
                item={task}
                onPress={() => openItem(task.id)}
                onToggleDone={() => toggleDone(task.id)}
              />
            ))}
          </View>
        ))
      )}
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
})
