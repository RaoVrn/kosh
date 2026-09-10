import { StyleSheet, Text, View } from 'react-native'
import type { ReactNode } from 'react'
import { colors, radius, spacing } from '../theme'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'

export function SettingsScreen() {
  return (
    <Content>
      <PageHeader title="Settings" subtitle="Kosh, tuned to you." />

      <Section label="App">
        <SettingRow label="Version" value="0.1.0 · MVP" />
        <SettingRow label="Theme" value="Dark" />
      </Section>

      <Section label="Coming soon">
        <SettingRow label="Notifications" value="Soon" muted />
        <SettingRow label="Voice capture" value="Soon" muted />
        <SettingRow label="Data & backup" value="Soon" muted />
      </Section>

      <View style={styles.about}>
        <Text style={styles.tagline}>Capture everything. Forget nothing. Do what matters.</Text>
      </View>
    </Content>
  )
}

function Section({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.card}>{children}</View>
    </View>
  )
}

function SettingRow({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, muted && styles.rowValueMuted]}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing.xl,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 15,
  },
  rowValue: {
    color: colors.textMuted,
    fontSize: 14,
  },
  rowValueMuted: {
    color: colors.textFaint,
  },
  about: {
    marginTop: spacing.xl,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  tagline: {
    color: colors.textFaint,
    fontSize: 13,
    textAlign: 'center',
  },
})
