import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, layout, spacing } from '../theme'
import { Icon } from './Icon'
import type { IconName } from '../navigation/types'
import { useNav } from '../state/NavContext'

export function TabBar() {
  const { screen, navigate, requestCaptureFocus, setMoreOpen } = useNav()

  return (
    <View style={styles.bar}>
      <TabItem
        icon="inbox"
        label="Inbox"
        active={screen === 'inbox'}
        onPress={() => navigate('inbox')}
      />
      <TabItem
        icon="calendar"
        label="Today"
        active={screen === 'today'}
        onPress={() => navigate('today')}
      />
      <Pressable
        onPress={() => {
          navigate('inbox')
          requestCaptureFocus()
        }}
        accessibilityRole="button"
        accessibilityLabel="New capture"
        accessibilityHint="Adds a new item to your inbox"
        style={({ pressed }) => [styles.capture, pressed && styles.capturePressed]}
      >
        <Icon name="plus" size={26} color={colors.background} />
      </Pressable>
      <TabItem
        icon="search"
        label="Search"
        active={screen === 'search'}
        onPress={() => navigate('search')}
      />
      <TabItem
        icon="more-horizontal"
        label="More"
        active={false}
        onPress={() => setMoreOpen(true)}
      />
    </View>
  )
}

interface TabItemProps {
  icon: IconName
  label: string
  active: boolean
  onPress: () => void
}

function TabItem({ icon, label, active, onPress }: TabItemProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
    >
      <Icon name={icon} size={21} color={active ? colors.accent : colors.textMuted} />
      <Text style={[styles.label, active && styles.labelActive]}>{label}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  bar: {
    height: layout.tabBarHeight,
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.borderSubtle,
    paddingHorizontal: spacing.sm,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  itemPressed: {
    opacity: 0.7,
  },
  label: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  labelActive: {
    color: colors.accent,
    fontWeight: '600',
  },
  capture: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: -22,
    borderWidth: 3,
    borderColor: colors.background,
  },
  capturePressed: {
    backgroundColor: colors.accentStrong,
  },
})
