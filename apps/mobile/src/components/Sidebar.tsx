import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, layout, radius, spacing } from '../theme'
import { Icon } from './Icon'
import type { IconName, ScreenName } from '../navigation/types'
import { PRIMARY_SECTIONS, SCREEN_ICONS, SCREEN_TITLES } from '../navigation/types'
import { useItems } from '@kosh/shared'
import { useNav } from '../state/NavContext'

export function Sidebar() {
  const { screen, navigate, requestCaptureFocus } = useNav()
  const { items } = useItems()
  const inboxCount = items.filter((i) => i.status === 'inbox').length

  return (
    <View style={styles.sidebar}>
      <View style={styles.brand}>
        <Text style={styles.logo}>Kosh</Text>
      </View>

      <Pressable
        onPress={() => {
          navigate('inbox')
          requestCaptureFocus()
        }}
        accessibilityRole="button"
        accessibilityLabel="New capture"
        style={({ pressed }) => [styles.capture, pressed && styles.pressed]}
      >
        <Icon name="plus" size={16} color={colors.background} />
        <Text style={styles.captureText}>New capture</Text>
      </Pressable>

      <View style={styles.section}>
        {PRIMARY_SECTIONS.map((s) => (
          <SidebarRow
            key={s}
            screen={s}
            active={screen === s}
            onPress={() => navigate(s)}
            count={s === 'inbox' && inboxCount > 0 ? inboxCount : undefined}
          />
        ))}
      </View>

      <View style={styles.divider} />

      <View style={styles.section}>
        <SidebarRow
          screen="search"
          active={screen === 'search'}
          onPress={() => navigate('search')}
        />
        <SidebarRow
          screen="notifications"
          active={screen === 'notifications'}
          onPress={() => navigate('notifications')}
        />
        <SidebarRow
          screen="settings"
          active={screen === 'settings'}
          onPress={() => navigate('settings')}
        />
      </View>
    </View>
  )
}

interface SidebarRowProps {
  screen: ScreenName
  active: boolean
  onPress: () => void
  count?: number
}

function SidebarRow({ screen, active, onPress, count }: SidebarRowProps) {
  const icon: IconName = SCREEN_ICONS[screen]
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={SCREEN_TITLES[screen]}
      style={({ pressed }) => [styles.row, active && styles.rowActive, pressed && styles.pressed]}
    >
      <Icon name={icon} size={17} color={active ? colors.accent : colors.textMuted} />
      <Text style={[styles.rowLabel, active && styles.rowLabelActive]}>
        {SCREEN_TITLES[screen]}
      </Text>
      {typeof count === 'number' ? (
        <View style={styles.count}>
          <Text style={styles.countText}>{count}</Text>
        </View>
      ) : null}
    </Pressable>
  )
}

const styles = StyleSheet.create({
  sidebar: {
    width: layout.sidebarWidth,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.borderSubtle,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  brand: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
  },
  logo: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 1,
  },
  capture: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 10,
    marginBottom: spacing.lg,
    marginHorizontal: spacing.sm,
  },
  captureText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.8,
  },
  section: {
    gap: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 9,
  },
  rowActive: {
    backgroundColor: colors.accentMuted,
  },
  rowLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '500',
  },
  rowLabelActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  count: {
    marginLeft: 'auto',
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    borderRadius: 11,
    backgroundColor: colors.surfaceRaised,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSubtle,
    marginVertical: spacing.lg,
    marginHorizontal: spacing.sm,
  },
})
