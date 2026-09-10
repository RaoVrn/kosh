import { StyleSheet, Text, View } from 'react-native'
import type { ItemType } from '@kosh/shared'
import { radius, typeColors } from '../theme'
import { typeLabel } from '../utils/labels'

interface TypeBadgeProps {
  type: ItemType
}

export function TypeBadge({ type }: TypeBadgeProps) {
  const color = typeColors[type]
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A` }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.label, { color }]} numberOfLines={1}>
        {typeLabel[type]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 3,
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
})
