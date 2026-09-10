import { useState } from 'react'
import { Pressable, StyleSheet, TextInput, View } from 'react-native'
import type { RefObject } from 'react'
import { colors, radius, spacing } from '../theme'
import { Icon } from './Icon'

interface CaptureInputProps {
  innerRef?: RefObject<TextInput | null>
  onSubmit: (text: string) => void
  onMicPress?: () => void
  placeholder?: string
}

export function CaptureInput({
  innerRef,
  onSubmit,
  onMicPress,
  placeholder = "What's on your mind?",
}: CaptureInputProps) {
  const [text, setText] = useState('')
  const canSubmit = text.trim().length > 0

  const handleSubmit = () => {
    const value = text.trim()
    if (!value) return
    onSubmit(value)
    setText('')
  }

  return (
    <View style={styles.wrap}>
      <TextInput
        ref={innerRef}
        style={styles.input}
        value={text}
        onChangeText={setText}
        placeholder={placeholder}
        placeholderTextColor={colors.textFaint}
        returnKeyType="send"
        onSubmitEditing={handleSubmit}
        accessibilityLabel="Capture text"
        accessibilityHint="Type anything and press send to add it to your inbox"
      />
      <Pressable
        onPress={onMicPress}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel="Voice capture"
        accessibilityHint="Voice capture is not available yet"
        style={styles.mic}
      >
        <Icon name="mic" size={18} color={colors.textFaint} />
      </Pressable>
      <Pressable
        onPress={handleSubmit}
        disabled={!canSubmit}
        accessibilityRole="button"
        accessibilityLabel="Add to inbox"
        accessibilityHint="Adds your text to the inbox"
        style={[styles.send, !canSubmit && styles.sendDisabled]}
      >
        <Icon name="arrow-up" size={18} color={canSubmit ? colors.background : colors.textFaint} />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingLeft: spacing.lg,
    paddingRight: spacing.sm,
    paddingVertical: 6,
    gap: spacing.xs,
  },
  input: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    paddingVertical: 8,
  },
  mic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    backgroundColor: colors.surfaceRaised,
  },
})
