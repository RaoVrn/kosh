import type { ComponentProps } from 'react'
import { Feather } from '@expo/vector-icons'
import type { ScreenName } from '@kosh/shared'

export type IconName = ComponentProps<typeof Feather>['name']

export type { ScreenName, PrimarySection } from '@kosh/shared'
export { PRIMARY_SECTIONS, SCREEN_TITLES } from '@kosh/shared'

export const SCREEN_ICONS: Record<ScreenName, IconName> = {
  inbox: 'inbox',
  today: 'calendar',
  tasks: 'check-square',
  notes: 'file-text',
  ideas: 'zap',
  learning: 'book-open',
  links: 'link',
  projects: 'folder',
  search: 'search',
  notifications: 'bell',
  settings: 'settings',
}
