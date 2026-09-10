import { StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { Icon } from './Icon'
import type { IconName } from '../navigation/types'

interface EmptyStateProps {
  icon: IconName
  title: string
  message: string
}

export function EmptyState({ icon, title, message }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Icon name={icon} size={22} color={colors.textFaint} />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xxl * 2,
    paddingHorizontal: spacing.xl,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    color: colors.textFaint,
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 320,
  },
})
