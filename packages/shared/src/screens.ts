export const SCREEN_NAMES = [
  'inbox',
  'today',
  'tasks',
  'notes',
  'ideas',
  'learning',
  'links',
  'projects',
  'search',
  'notifications',
  'settings',
] as const

export type ScreenName = (typeof SCREEN_NAMES)[number]

export type PrimarySection = Exclude<ScreenName, 'search' | 'notifications' | 'settings'>

export const PRIMARY_SECTIONS: readonly PrimarySection[] = [
  'inbox',
  'today',
  'tasks',
  'notes',
  'ideas',
  'learning',
  'links',
  'projects',
]

export const SCREEN_TITLES: Record<ScreenName, string> = {
  inbox: 'Inbox',
  today: 'Today',
  tasks: 'Tasks',
  notes: 'Notes',
  ideas: 'Ideas',
  learning: 'Learning',
  links: 'Links',
  projects: 'Projects',
  search: 'Search',
  notifications: 'Notifications',
  settings: 'Settings',
}
