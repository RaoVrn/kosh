import type { ComponentProps } from 'react'
import { Feather } from '@expo/vector-icons'

export type IconName = ComponentProps<typeof Feather>['name']

export type ScreenName =
  'inbox' | 'today' | 'tasks' | 'notes' | 'ideas' | 'learning' | 'search' | 'settings'

export type PrimarySection = Exclude<ScreenName, 'search' | 'settings'>

export const PRIMARY_SECTIONS: readonly PrimarySection[] = [
  'inbox',
  'today',
  'tasks',
  'notes',
  'ideas',
  'learning',
]

export const SCREEN_ICONS: Record<ScreenName, IconName> = {
  inbox: 'inbox',
  today: 'calendar',
  tasks: 'check-square',
  notes: 'file-text',
  ideas: 'zap',
  learning: 'book-open',
  search: 'search',
  settings: 'settings',
}

export const SCREEN_TITLES: Record<ScreenName, string> = {
  inbox: 'Inbox',
  today: 'Today',
  tasks: 'Tasks',
  notes: 'Notes',
  ideas: 'Ideas',
  learning: 'Learning',
  search: 'Search',
  settings: 'Settings',
}
