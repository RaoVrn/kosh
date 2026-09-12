import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useProjects } from '@kosh/shared'
import { colors, radius, spacing } from '../theme'

interface ProjectSelectorProps {
  value: string | null
  onChange: (projectId: string | null) => void
  includeArchivedId?: string | null
}

export function ProjectSelector({ value, onChange, includeArchivedId }: ProjectSelectorProps) {
  const { projects } = useProjects()
  const active = projects.filter((p) => !p.archivedAt)
  const archivedVisible = projects.filter(
    (p) => p.archivedAt && (value === p.id || includeArchivedId === p.id),
  )
  const options = [null, ...active, ...archivedVisible]

  return (
    <View>
      <Text style={styles.label}>Project</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(null)}
          accessibilityRole="button"
          accessibilityLabel="No project"
          accessibilityState={{ selected: value === null }}
          style={[styles.chip, value === null && styles.chipActive]}
        >
          <Text style={[styles.chipText, value === null && styles.chipTextActive]}>None</Text>
        </Pressable>
        {options
          .filter((p): p is NonNullable<typeof p> => p !== null)
          .map((p) => (
            <Pressable
              key={p.id}
              onPress={() => onChange(p.id)}
              accessibilityRole="button"
              accessibilityLabel={p.archivedAt ? `${p.name} (archived)` : p.name}
              accessibilityState={{ selected: value === p.id }}
              style={[styles.chip, value === p.id && styles.chipActive]}
            >
              <Text style={[styles.chipText, value === p.id && styles.chipTextActive]}>
                {p.archivedAt ? `${p.name} (archived)` : p.name}
              </Text>
            </Pressable>
          ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  label: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.accent,
  },
})
