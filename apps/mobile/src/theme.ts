export const colors = {
  background: '#0B0B0F',
  surface: '#131318',
  surfaceRaised: '#1A1A21',
  border: '#26262E',
  borderSubtle: '#1C1C22',
  text: '#F2F2F7',
  textMuted: '#9A9AA5',
  textFaint: '#6A6A75',
  accent: '#8B7CF6',
  accentStrong: '#A294FF',
  accentMuted: 'rgba(139, 124, 246, 0.14)',
  danger: '#FF6B5E',
  success: '#4CD97B',
  warning: '#E7B75A',
  info: '#6EA8FF',
} as const

export type ColorToken = keyof typeof colors

export const typeColors: Record<string, string> = {
  task: colors.accent,
  note: colors.textMuted,
  idea: colors.info,
  learning: colors.success,
  link: colors.warning,
}

export const priorityColors: Record<string, string> = {
  low: colors.textFaint,
  medium: colors.warning,
  high: colors.danger,
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
} as const

export const fontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
} as const

export const fonts = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
} as const

export const layout = {
  contentMaxWidth: 760,
  sidebarWidth: 260,
  tabBarHeight: 60,
  desktopBreakpoint: 768,
} as const
