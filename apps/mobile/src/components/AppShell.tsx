import { useEffect } from 'react'
import { StatusBar } from 'expo-status-bar'
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native'
import { colors, layout, radius, spacing } from '../theme'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Sidebar } from './Sidebar'
import { TabBar } from './TabBar'
import { MoreMenu } from './MoreMenu'
import { ItemDetailSheet } from './ItemDetailSheet'
import { InboxScreen } from '../screens/InboxScreen'
import { TodayScreen } from '../screens/TodayScreen'
import { TasksScreen } from '../screens/TasksScreen'
import { NotesScreen } from '../screens/NotesScreen'
import { IdeasScreen } from '../screens/IdeasScreen'
import { LearningScreen } from '../screens/LearningScreen'
import { LinksScreen } from '../screens/LinksScreen'
import { SearchScreen } from '../screens/SearchScreen'
import { NotificationsScreen } from '../screens/NotificationsScreen'
import { SettingsScreen } from '../screens/SettingsScreen'
import { planTaskReminders } from '../notifications/plan'
import { syncTaskReminderNotifications } from '../notifications/schedule'

export function AppShell() {
  const { width } = useWindowDimensions()
  const isDesktop = width >= layout.desktopBreakpoint
  const { loading, error, refresh, items } = useItems()

  useEffect(() => {
    void syncTaskReminderNotifications(planTaskReminders(items)).catch((err) => {
      console.warn('[notifications] sync failed', err)
    })
  }, [items])

  const content = (
    <>
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <Pressable
            onPress={() => void refresh()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading items"
            hitSlop={8}
          >
            <Text style={styles.errorRetry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {loading ? <LoadingState /> : <ScreenRenderer />}
    </>
  )

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {isDesktop ? (
        <View style={styles.desktop}>
          <Sidebar />
          <View style={styles.main}>{content}</View>
        </View>
      ) : (
        <View style={styles.mobile}>
          {content}
          <TabBar />
        </View>
      )}
      <MoreMenu />
      <ItemDetailSheet />
    </View>
  )
}

function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.loadingText}>Loading…</Text>
    </View>
  )
}

function ScreenRenderer() {
  const { screen } = useNav()
  switch (screen) {
    case 'inbox':
      return <InboxScreen />
    case 'today':
      return <TodayScreen />
    case 'tasks':
      return <TasksScreen />
    case 'notes':
      return <NotesScreen />
    case 'ideas':
      return <IdeasScreen />
    case 'learning':
      return <LearningScreen />
    case 'links':
      return <LinksScreen />
    case 'search':
      return <SearchScreen />
    case 'notifications':
      return <NotificationsScreen />
    case 'settings':
      return <SettingsScreen />
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  desktop: {
    flex: 1,
    flexDirection: 'row',
  },
  main: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mobile: {
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.md,
    backgroundColor: 'rgba(255, 107, 94, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 94, 0.4)',
    borderRadius: radius.md,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 13,
  },
  errorRetry: {
    color: colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  loadingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
})
