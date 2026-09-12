import { useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { Icon } from './Icon'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  accessibilityLabel?: string
  placeholder?: string
}

export function TagInput({
  tags,
  onChange,
  accessibilityLabel = 'Tags',
  placeholder = 'Add a tag',
}: TagInputProps) {
  const [value, setValue] = useState('')

  const addTag = () => {
    const tag = value.trim().replace(/,/g, '')
    if (!tag) return
    if (!tags.includes(tag)) onChange([...tags, tag])
    setValue('')
  }

  const removeTag = (tag: string) => onChange(tags.filter((t) => t !== tag))

  return (
    <View>
      {tags.length > 0 ? (
        <View style={styles.tagList}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
              <Pressable
                onPress={() => removeTag(tag)}
                hitSlop={6}
                accessibilityRole="button"
                accessibilityLabel={`Remove tag ${tag}`}
              >
                <Icon name="x" size={10} color={colors.textFaint} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <TextInput
        value={value}
        onChangeText={setValue}
        onSubmitEditing={addTag}
        onBlur={addTag}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="done"
        style={styles.input}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  tagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: spacing.sm,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '500',
  },
  input: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    color: colors.text,
    fontSize: 14,
  },
})
