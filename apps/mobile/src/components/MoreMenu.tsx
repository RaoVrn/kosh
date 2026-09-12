import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { Icon } from './Icon'
import type { IconName, ScreenName } from '../navigation/types'
import { useNav } from '../state/NavContext'

const MORE_ITEMS: { screen: ScreenName; icon: IconName; title: string }[] = [
  { screen: 'notes', icon: 'file-text', title: 'Notes' },
  { screen: 'ideas', icon: 'zap', title: 'Ideas' },
  { screen: 'learning', icon: 'book-open', title: 'Learning' },
  { screen: 'links', icon: 'link', title: 'Links' },
  { screen: 'notifications', icon: 'bell', title: 'Notifications' },
  { screen: 'settings', icon: 'settings', title: 'Settings' },
]

export function MoreMenu() {
  const { moreOpen, setMoreOpen, navigate, screen } = useNav()
  const close = () => setMoreOpen(false)

  return (
    <Modal visible={moreOpen} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={close}
          accessibilityLabel="Close menu"
        />
        <View style={styles.sheet}>
          <Text style={styles.heading}>More</Text>
          {MORE_ITEMS.map((item) => {
            const active = screen === item.screen
            return (
              <Pressable
                key={item.screen}
                onPress={() => navigate(item.screen)}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={item.title}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <Icon
                  name={item.icon}
                  size={18}
                  color={active ? colors.accent : colors.textMuted}
                />
                <Text style={[styles.label, active && styles.labelActive]}>{item.title}</Text>
                {active ? <View style={styles.check} /> : null}
              </Pressable>
            )
          })}
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  heading: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 13,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.accent,
  },
  check: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.accentMuted,
    marginLeft: 'auto',
  },
})
