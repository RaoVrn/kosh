import { StyleSheet, Text, View } from 'react-native'
import type { ReactNode } from 'react'
import { colors } from '../theme'

interface PageHeaderProps {
  title: string
  subtitle?: string
  count?: number
  right?: ReactNode
}

export function PageHeader({ title, subtitle, count, right }: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.row}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{title}</Text>
          {typeof count === 'number' && count > 0 ? (
            <View style={styles.count}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          ) : null}
        </View>
        {right}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  count: {
    minWidth: 26,
    height: 26,
    paddingHorizontal: 8,
    borderRadius: 13,
    backgroundColor: colors.accentMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
})
