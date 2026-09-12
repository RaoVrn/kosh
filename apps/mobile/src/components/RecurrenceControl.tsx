import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { WEEKDAYS } from '@kosh/shared'
import { WEEKDAY_LETTERS, recurrenceFrequencyLabel } from '@kosh/shared'
import type { Recurrence } from '@kosh/shared'
import { colors, radius, spacing } from '../theme'

const FREQUENCIES = ['none', 'daily', 'weekly', 'monthly'] as const

interface RecurrenceControlProps {
  value: Recurrence | null
  onChange: (recurrence: Recurrence | null) => void
}

export function RecurrenceControl({ value, onChange }: RecurrenceControlProps) {
  const frequency = value?.frequency ?? 'none'

  const setFrequency = (f: (typeof FREQUENCIES)[number]) => {
    if (f === 'none') onChange(null)
    else if (f === 'daily') onChange({ frequency: 'daily' })
    else if (f === 'weekly') {
      const weekdays = value?.frequency === 'weekly' && value.weekdays?.length ? value.weekdays : []
      onChange({ frequency: 'weekly', weekdays })
    } else {
      const dayOfMonth = value?.frequency === 'monthly' ? (value.dayOfMonth ?? 15) : 15
      onChange({ frequency: 'monthly', dayOfMonth })
    }
  }

  const toggleWeekday = (day: number) => {
    const current = value?.frequency === 'weekly' ? (value.weekdays ?? []) : []
    const next = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort((a, b) => a - b)
    onChange({ frequency: 'weekly', weekdays: next })
  }

  const setDayOfMonth = (raw: string) => {
    const n = Number(raw)
    if (!Number.isInteger(n) || n < 1 || n > 31) return
    onChange({ frequency: 'monthly', dayOfMonth: n })
  }

  const dayName = (day: number) =>
    day === 0
      ? 'Sunday'
      : day === 1
        ? 'Monday'
        : day === 2
          ? 'Tuesday'
          : day === 3
            ? 'Wednesday'
            : day === 4
              ? 'Thursday'
              : day === 5
                ? 'Friday'
                : 'Saturday'

  return (
    <View>
      <View style={styles.chipRow}>
        {FREQUENCIES.map((f) => (
          <Pressable
            key={f}
            onPress={() => setFrequency(f)}
            accessibilityRole="button"
            accessibilityLabel={recurrenceFrequencyLabel[f]}
            accessibilityState={{ selected: frequency === f }}
            style={({ pressed }) => [
              styles.chip,
              frequency === f && styles.chipActive,
              pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>
              {recurrenceFrequencyLabel[f]}
            </Text>
          </Pressable>
        ))}
      </View>

      {frequency === 'weekly' ? (
        <View style={styles.weekdayRow}>
          {WEEKDAYS.map((day) => {
            const selected = value?.weekdays?.includes(day) ?? false
            return (
              <Pressable
                key={day}
                onPress={() => toggleWeekday(day)}
                accessibilityRole="button"
                accessibilityLabel={`${dayName(day)} ${selected ? '(selected)' : ''}`}
                accessibilityState={{ selected }}
                style={({ pressed }) => [
                  styles.weekday,
                  selected && styles.weekdaySelected,
                  pressed && styles.pressed,
                ]}
              >
                <Text style={[styles.weekdayText, selected && styles.weekdayTextSelected]}>
                  {WEEKDAY_LETTERS[day]}
                </Text>
              </Pressable>
            )
          })}
        </View>
      ) : null}

      {frequency === 'monthly' ? (
        <View style={styles.monthlyRow}>
          <Text style={styles.monthlyLabel}>Day of month</Text>
          <TextInput
            style={styles.monthlyInput}
            value={String(value?.frequency === 'monthly' ? (value.dayOfMonth ?? 15) : 15)}
            onChangeText={setDayOfMonth}
            keyboardType="number-pad"
            maxLength={2}
            accessibilityLabel="Day of month"
          />
        </View>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  chipRow: {
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
  pressed: {
    opacity: 0.8,
  },
  weekdayRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  weekday: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdaySelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  weekdayText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  weekdayTextSelected: {
    color: colors.accent,
  },
  monthlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  monthlyLabel: {
    color: colors.textMuted,
    fontSize: 13,
  },
  monthlyInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: 64,
  },
})
