import { ScrollView, StyleSheet } from 'react-native'
import type { ReactNode } from 'react'
import { colors, layout, spacing } from '../theme'

export function Content({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.inner}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inner: {
    width: '100%',
    maxWidth: layout.contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
})
