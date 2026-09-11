import { FlatList, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { relativeTime, useItems, useNotifications } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { EmptyState } from '../components/EmptyState'

export function NotificationsScreen() {
  const { notifications, unreadCount, markRead } = useNotifications()
  const { items } = useItems()
  const { openItem } = useNav()

  return (
    <Content>
      <PageHeader title="Notifications" subtitle="Reminders that have fired." count={unreadCount} />
      {notifications.length === 0 ? (
        <EmptyState
          icon="bell"
          title="No notifications"
          message="Set a reminder on a task and it will appear here when it fires."
        />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => {
            const linked = item.itemId && items.some((i) => i.id === item.itemId)
            return (
              <View
                style={[styles.card, !item.readAt && styles.unread]}
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onTouchEnd={() => {
                  void markRead(item.id)
                  if (linked && item.itemId) openItem(item.itemId)
                }}
              >
                <View style={styles.row}>
                  <Text style={[styles.title, !item.readAt && styles.unreadTitle]}>
                    {item.title}
                  </Text>
                  {!item.readAt ? <View style={styles.dot} /> : null}
                </View>
                {item.body ? (
                  <Text style={styles.body} numberOfLines={2}>
                    {item.body}
                  </Text>
                ) : null}
                <Text style={styles.time}>{relativeTime(item.createdAt)}</Text>
              </View>
            )
          }}
          contentContainerStyle={styles.listInner}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={<View style={styles.spacer} />}
        />
      )}
    </Content>
  )
}

const styles = StyleSheet.create({
  listInner: {
    paddingBottom: spacing.xxl,
  },
  spacer: {
    height: spacing.xs,
  },
  separator: {
    height: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  unread: {
    borderColor: colors.accent,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  unreadTitle: {
    color: colors.accentStrong,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  body: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  time: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: spacing.sm,
  },
})
