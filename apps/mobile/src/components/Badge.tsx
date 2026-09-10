import { StyleSheet, Text, View } from 'react-native'
import { colors, radius } from '../theme'

interface BadgeProps {
  label: string
  color?: string
}

export function Badge({ label, color = colors.textMuted }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}22` }]}>
      <Text style={[styles.text, { color }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
})
