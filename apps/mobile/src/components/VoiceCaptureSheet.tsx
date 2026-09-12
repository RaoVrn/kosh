import { useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { colors, radius, spacing } from '../theme'
import { CapturePreviewSheet } from './CapturePreviewSheet'
import { useRecorder } from '../voice/useRecorder'
import { useVoiceFlow } from '../voice/useVoiceFlow'
import type { VoiceStage } from '../voice/types'

interface VoiceCaptureSheetProps {
  onClose: () => void
  onSaved: () => void
}

export function VoiceCaptureSheet({ onClose, onSaved }: VoiceCaptureSheetProps) {
  const [session, setSession] = useState(0)

  return (
    <VoiceCaptureSheetInner
      key={session}
      onClose={onClose}
      onSaved={onSaved}
      onRecordAgain={() => setSession((s) => s + 1)}
    />
  )
}

interface InnerProps extends VoiceCaptureSheetProps {
  onRecordAgain: () => void
}

function VoiceCaptureSheetInner({ onClose, onSaved, onRecordAgain }: InnerProps) {
  const recorder = useRecorder()
  const flow = useVoiceFlow(recorder, onSaved)
  const { state, transcript, setTranscript, smartResult } = flow

  const handleClose = () => {
    flow.cancel()
    onClose()
  }

  if (!recorder.supported) {
    return (
      <Modal visible transparent animationType="slide" onRequestClose={onClose}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
          <View style={styles.sheet}>
            <View style={styles.state}>
              <Text style={styles.stateTitle}>Voice capture isn't supported in this browser.</Text>
              <Text style={styles.stateSub}>Use the mobile app to record voice captures.</Text>
              <Pressable
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.secondary}
              >
                <Text style={styles.secondaryText}>Close</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    )
  }

  if (smartResult) {
    return (
      <CapturePreviewSheet
        result={smartResult}
        originalText={transcript}
        onSave={onSaved}
        onCancel={handleClose}
        onInbox={() => void flow.saveToInbox()}
      />
    )
  }

  return (
    <Modal visible transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Close" />
        <View style={styles.sheet}>{renderStage(flow, handleClose, onRecordAgain, transcript, setTranscript)}</View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function renderStage(
  flow: ReturnType<typeof useVoiceFlow>,
  handleClose: () => void,
  onRecordAgain: () => void,
  transcript: string,
  setTranscript: (text: string) => void,
) {
  const stage: VoiceStage = flow.state.stage
  const seconds = flow.state.seconds

  switch (stage) {
    case 'idle':
      return (
        <View style={styles.state}>
          <Pressable
            onPress={flow.start}
            accessibilityRole="button"
            accessibilityLabel="Start recording"
            style={styles.mic}
          >
            <Text style={styles.micText}>🎙</Text>
          </Pressable>
          <Text style={styles.stateTitle}>Tap to record</Text>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      )
    case 'permission':
      return <SpinnerState label="Requesting microphone permission…" />
    case 'preparing':
      return <SpinnerState label="Preparing microphone…" />
    case 'recording':
      return (
        <View style={styles.state}>
          <View style={[styles.mic, styles.micRecording]}>
            <Text style={styles.micText}>🎙</Text>
          </View>
          <Text style={styles.stateTitle}>
            Listening… {String(Math.floor(seconds / 60)).padStart(2, '0')}:
            {String(seconds % 60).padStart(2, '0')}
          </Text>
          <Pressable
            onPress={flow.stop}
            accessibilityRole="button"
            accessibilityLabel="Stop recording"
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Stop</Text>
          </Pressable>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      )
    case 'stopping':
      return <SpinnerState label="Stopping recording…" />
    case 'uploading':
      return <SpinnerState label="Uploading recording…" />
    case 'transcribing':
      return <SpinnerState label="Transcribing…" />
    case 'interpreting':
      return <SpinnerState label="Kosh is understanding…" />
    case 'transcriptReady':
      return (
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <Text style={styles.heading}>Transcript</Text>
            <Pressable
              onPress={handleClose}
              hitSlop={10}
              accessibilityRole="button"
              accessibilityLabel="Close"
              style={styles.close}
            >
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>
          <TextInput
            value={transcript}
            onChangeText={setTranscript}
            style={styles.transcriptInput}
            multiline
            placeholder="Transcript"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Transcript"
          />
          <Pressable
            onPress={flow.understand}
            accessibilityRole="button"
            accessibilityLabel="Use transcript"
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Use transcript</Text>
          </Pressable>
          <Pressable
            onPress={onRecordAgain}
            accessibilityRole="button"
            accessibilityLabel="Record again"
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Record again</Text>
          </Pressable>
          <Pressable
            onPress={() => void flow.saveToInbox()}
            accessibilityRole="button"
            accessibilityLabel="Save to Inbox"
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Save to Inbox</Text>
          </Pressable>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </ScrollView>
      )
    case 'error':
      return (
        <View style={styles.state}>
          <Text style={styles.error}>{flow.state.error ?? 'Something went wrong.'}</Text>
          <Pressable
            onPress={flow.retry}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={styles.primary}
          >
            <Text style={styles.primaryText}>Try again</Text>
          </Pressable>
          <Pressable
            onPress={onRecordAgain}
            accessibilityRole="button"
            accessibilityLabel="Record again"
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Record again</Text>
          </Pressable>
          <Pressable
            onPress={handleClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            style={styles.secondary}
          >
            <Text style={styles.secondaryText}>Cancel</Text>
          </Pressable>
        </View>
      )
  }
}

function SpinnerState({ label }: { label: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.stateTitle}>{label}</Text>
    </View>
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
  content: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
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
  error: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  mic: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micRecording: {
    backgroundColor: colors.danger,
  },
  micText: {
    fontSize: 34,
  },
  primary: {
    alignSelf: 'stretch',
    marginTop: spacing.md,
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  secondary: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  close: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  transcriptInput: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    minHeight: 120,
    textAlignVertical: 'top',
  },
})