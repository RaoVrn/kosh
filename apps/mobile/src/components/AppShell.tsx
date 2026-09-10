import { StatusBar } from 'expo-status-bar'
import { StyleSheet, useWindowDimensions, View } from 'react-native'
import { colors, layout } from '../theme'
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
import { SearchScreen } from '../screens/SearchScreen'
import { SettingsScreen } from '../screens/SettingsScreen'

export function AppShell() {
  const { width } = useWindowDimensions()
  const isDesktop = width >= layout.desktopBreakpoint

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      {isDesktop ? (
        <View style={styles.desktop}>
          <Sidebar />
          <View style={styles.main}>
            <ScreenRenderer />
          </View>
        </View>
      ) : (
        <View style={styles.mobile}>
          <ScreenRenderer />
          <TabBar />
        </View>
      )}
      <MoreMenu />
      <ItemDetailSheet />
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
    case 'search':
      return <SearchScreen />
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
})
