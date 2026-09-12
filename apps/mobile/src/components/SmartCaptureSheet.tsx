import { useEffect } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useItems, useSmartCapture } from '@kosh/shared'
import { colors, radius, spacing } from '../theme'
import { CapturePreviewSheet } from './CapturePreviewSheet'

interface SmartCaptureSheetProps {
  text: string
  onClose: () => void
  onSaved: () => void
}

export function SmartCaptureSheet({ text, onClose, onSaved }: SmartCaptureSheetProps) {
  const { addItem } = useItems()
  const { status, result, error, interpretText, reset } = useSmartCapture()

  useEffect(() => {
    void interpretText(text)
    return reset
  }, [])

  const saveToInbox = async () => {
    await addItem({ title: text })
    onSaved()
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>
          {status === 'interpreting' ? (
            <View style={styles.state}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.stateTitle}>Kosh is understanding…</Text>
              <Text style={styles.stateSub}>Your capture is safe.</Text>
            </View>
          ) : status === 'error' ? (
            <View style={styles.state}>
              <Text style={styles.stateTitle}>Couldn't interpret this right now.</Text>
              <Text style={styles.stateSub}>{error}</Text>
              <Text style={styles.stateOriginal}>"{text}"</Text>
              <Pressable
                onPress={() => void saveToInbox()}
                accessibilityRole="button"
                accessibilityLabel="Save to Inbox"
                style={styles.save}
              >
                <Text style={styles.saveText}>Save to Inbox</Text>
              </Pressable>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>Cancel</Text>
              </Pressable>
            </View>
          ) : result ? (
            <CapturePreviewSheet
              result={result}
              originalText={text}
              onSave={onSaved}
              onCancel={onClose}
              onInbox={() => void saveToInbox()}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
  },
  state: {
    alignItems: 'center',
    padding: spacing.xxl,
    gap: spacing.md,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  stateSub: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  stateOriginal: {
    color: colors.textFaint,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  save: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  secondary: {
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
  },
  secondaryText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
})
