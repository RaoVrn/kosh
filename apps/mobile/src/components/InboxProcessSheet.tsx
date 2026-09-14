import { useEffect, useMemo, useState } from 'react'
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native'
import {
  errorMessage,
  formatDue,
  priorityLabel,
  recurrenceLabel,
  typeLabel,
  useItems,
  useProjects,
} from '@kosh/shared'
import type {
  InboxProcessingResult,
  InboxProcessingSuggestion,
  Item,
  ItemType,
  Priority,
  Recurrence,
} from '@kosh/shared'
import { colors, radius, spacing } from '../theme'
import { Icon } from './Icon'
import { ProjectSelector } from './ProjectSelector'
import { RecurrenceControl } from './RecurrenceControl'
import { TagInput } from './TagInput'

type Status = 'processing' | 'error' | 'ready' | 'accepting' | 'success'

interface InboxProcessSheetProps {
  item: Item
  onClose: () => void
  onDone: () => void
}

const TYPE_LABELS: { value: ItemType; label: string }[] = [
  { value: 'task', label: 'Task' },
  { value: 'note', label: 'Note' },
  { value: 'idea', label: 'Idea' },
  { value: 'learning', label: 'Learning' },
  { value: 'link', label: 'Link' },
]

export function InboxProcessSheet({ item, onClose, onDone }: InboxProcessSheetProps) {
  const { client, items } = useItems()
  const { projects } = useProjects()
  const [status, setStatus] = useState<Status>('processing')
  const [error, setError] = useState<string | null>(null)
  const [suggestions, setSuggestions] = useState<InboxProcessingSuggestion[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<number | null>(null)
  const [markProcessed, setMarkProcessed] = useState(true)
  const [createdCount, setCreatedCount] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  const existingTitles = useMemo(
    () => new Set(items.map((i) => i.title.trim().toLowerCase())),
    [items],
  )

  useEffect(() => {
    let cancelled = false
    setStatus('processing')
    setError(null)
    void client
      .processInboxItem(item.id)
      .then((res: InboxProcessingResult) => {
        if (cancelled) return
        setSuggestions(res.suggestions)
        setSelected(new Set(res.suggestions.map((_, i) => i)))
        setMarkProcessed(true)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(errorMessage(err, "Couldn't process this capture. Your original item is safe."))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [client, item.id])

  const accept = async () => {
    if (selected.size === 0) return
    setStatus('accepting')
    setError(null)
    setMessage(null)
    try {
      const accepted = [...selected]
        .sort((a, b) => a - b)
        .map((i) => suggestions[i])
        .filter((s): s is InboxProcessingSuggestion => s !== undefined)
      const response = await client.acceptProcessedSuggestions(item.id, {
        suggestions: accepted,
        markSourceProcessed: markProcessed,
      })
      setCreatedCount(response.created.length)
      setStatus('success')
    } catch (err) {
      setError(errorMessage(err, 'Could not accept the suggestions'))
      setStatus('ready')
    }
  }

  const toggleSelected = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const updateSuggestion = (index: number, patch: Partial<InboxProcessingSuggestion>) => {
    setSuggestions((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const attachmentCount = item.attachmentCount ?? 0

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityLabel="Close processing"
        />
        <View style={styles.sheet}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <View style={styles.headerRow}>
              <Text style={styles.heading}>Process capture</Text>
              <Pressable
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Close"
                style={styles.close}
              >
                <Text style={styles.closeText}>✕</Text>
              </Pressable>
            </View>

            {status === 'processing' ? (
              <Text style={styles.stateText}>Kosh is reviewing this capture…</Text>
            ) : status === 'error' ? (
              <View style={styles.state}>
                <Text style={styles.stateTitle}>Couldn't process this capture.</Text>
                <Text style={styles.stateSub}>{error}</Text>
                <Text style={styles.stateOriginal}>"{item.title}"</Text>
                <Pressable
                  onPress={() => {
                    setStatus('processing')
                    setError(null)
                    void client
                      .processInboxItem(item.id)
                      .then((res: InboxProcessingResult) => {
                        setSuggestions(res.suggestions)
                        setSelected(new Set(res.suggestions.map((_, i) => i)))
                        setStatus('ready')
                      })
                      .catch((err: unknown) => {
                        setError(
                          errorMessage(
                            err,
                            "Couldn't process this capture. Your original item is safe.",
                          ),
                        )
                        setStatus('error')
                      })
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Try again"
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryText}>Try again</Text>
                </Pressable>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
              </View>
            ) : status === 'success' ? (
              <View style={styles.state}>
                <Text style={styles.stateTitle}>
                  {createdCount} item{createdCount === 1 ? '' : 's'} created
                </Text>
                {message ? <Text style={styles.stateSub}>{message}</Text> : null}
                <Pressable
                  onPress={onDone}
                  accessibilityRole="button"
                  accessibilityLabel="Done"
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryText}>Done</Text>
                </Pressable>
              </View>
            ) : (
              <>
                <View style={styles.sourceCard}>
                  <Text style={styles.sourceLabel}>Original capture</Text>
                  <Text style={styles.sourceTitle}>{item.title}</Text>
                  {item.body ? <Text style={styles.sourceBody}>{item.body}</Text> : null}
                  {attachmentCount > 0 ? (
                    <Text style={styles.sourceMeta}>
                      {attachmentCount} attachment{attachmentCount === 1 ? '' : 's'} — kept on this
                      capture
                    </Text>
                  ) : null}
                </View>

                <Text style={styles.suggestionsLabel}>
                  Suggested actions ({suggestions.length})
                </Text>

                {suggestions.map((s, i) => {
                  const isSelected = selected.has(i)
                  const isDuplicate = existingTitles.has(s.title.trim().toLowerCase())
                  return (
                    <View key={i} style={[styles.card, isSelected && styles.cardSelected]}>
                      <View style={styles.cardRow}>
                        <Pressable
                          onPress={() => toggleSelected(i)}
                          hitSlop={8}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: isSelected }}
                          accessibilityLabel={`Select ${s.title}`}
                          style={[styles.check, isSelected && styles.checkDone]}
                        >
                          {isSelected ? (
                            <Icon name="check" size={12} color={colors.background} />
                          ) : null}
                        </Pressable>
                        <View style={styles.cardBody}>
                          <View style={styles.cardHead}>
                            <Text style={styles.cardType}>{typeLabel[s.type]}</Text>
                            <Text style={styles.cardConfidence}>{s.confidence}</Text>
                          </View>
                          {editing === i ? (
                            <SuggestionEditor
                              suggestion={s}
                              projects={projects}
                              onChange={(patch) => updateSuggestion(i, patch)}
                            />
                          ) : (
                            <>
                              <Text style={styles.cardTitle}>{s.title}</Text>
                              {s.body ? (
                                <Text style={styles.cardBodyText} numberOfLines={2}>
                                  {s.body}
                                </Text>
                              ) : null}
                              <View style={styles.metaRow}>
                                {s.projectId || s.projectName ? (
                                  <Text style={styles.tag}>↳ {s.projectName ?? 'project'}</Text>
                                ) : null}
                                {s.dueAt ? (
                                  <Text style={styles.tag}>{formatDue(s.dueAt)}</Text>
                                ) : null}
                                {s.priority ? (
                                  <Text style={styles.tag}>{priorityLabel[s.priority]}</Text>
                                ) : null}
                                {s.recurrence && s.recurrence.frequency !== 'none' ? (
                                  <Text style={styles.tag}>{recurrenceLabel(s.recurrence)}</Text>
                                ) : null}
                                {(s.tags ?? []).map((t) => (
                                  <Text key={t} style={styles.tag}>
                                    {t}
                                  </Text>
                                ))}
                              </View>
                            </>
                          )}
                        </View>
                        <View style={styles.cardActions}>
                          <Pressable
                            onPress={() => setEditing(editing === i ? null : i)}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={editing === i ? 'Done editing' : `Edit ${s.title}`}
                            style={styles.iconButton}
                          >
                            <Icon name={editing === i ? 'check' : 'file-text'} size={15} />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              setSuggestions((prev) => prev.filter((_, idx) => idx !== i))
                              setSelected((prev) => {
                                const next = new Set<number>()
                                for (const idx of prev) {
                                  if (idx === i) continue
                                  next.add(idx > i ? idx - 1 : idx)
                                }
                                return next
                              })
                              setEditing(null)
                            }}
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel={`Remove ${s.title}`}
                            style={styles.iconButton}
                          >
                            <Icon name="trash" size={15} color={colors.warning} />
                          </Pressable>
                        </View>
                      </View>
                      {isDuplicate ? (
                        <Text style={styles.duplicateText}>Similar item already exists.</Text>
                      ) : null}
                    </View>
                  )
                })}

                {error ? (
                  <Text style={styles.errorText}>{error} — your original item is safe.</Text>
                ) : null}

                <View style={styles.markRow}>
                  <Text style={styles.markLabel}>Mark original capture as processed</Text>
                  <Switch
                    value={markProcessed}
                    onValueChange={setMarkProcessed}
                    trackColor={{ true: colors.accent }}
                  />
                </View>

                <Pressable
                  onPress={() => void accept()}
                  disabled={selected.size === 0 || status === 'accepting'}
                  accessibilityRole="button"
                  accessibilityLabel="Accept selected"
                  style={[styles.primaryButton, selected.size === 0 && styles.disabled]}
                >
                  <Text style={styles.primaryText}>
                    {status === 'accepting'
                      ? 'Creating…'
                      : `Accept selected (${selected.size} of ${suggestions.length})`}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={onClose}
                  disabled={status === 'accepting'}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel"
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>Cancel</Text>
                </Pressable>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function SuggestionEditor({
  suggestion,
  projects,
  onChange,
}: {
  suggestion: InboxProcessingSuggestion
  projects: { id: string; name: string; archivedAt?: string | null }[]
  onChange: (patch: Partial<InboxProcessingSuggestion>) => void
}) {
  const [title, setTitle] = useState(suggestion.title)
  const [body, setBody] = useState(suggestion.body ?? '')
  const [type, setType] = useState<ItemType>(suggestion.type)
  const [priority, setPriority] = useState<Priority | null>(suggestion.priority)
  const [tags, setTags] = useState<string[]>(suggestion.tags ?? [])
  const [recurrence, setRecurrence] = useState<Recurrence | null>(suggestion.recurrence)

  useEffect(() => {
    onChange({ title, body: body || null, type, priority, tags, recurrence })
  }, [title, body, type, priority, tags, recurrence])

  return (
    <View style={styles.editor}>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        accessibilityLabel="Suggestion title"
      />
      <TextInput
        style={[styles.input, styles.multiline]}
        value={body}
        onChangeText={setBody}
        multiline
        placeholder="Details…"
        placeholderTextColor={colors.textFaint}
        accessibilityLabel="Suggestion body"
      />
      <View style={styles.chipRow}>
        {TYPE_LABELS.map((t) => (
          <Pressable
            key={t.value}
            onPress={() => setType(t.value)}
            accessibilityRole="button"
            accessibilityLabel={t.label}
            accessibilityState={{ selected: type === t.value }}
            style={[styles.chip, type === t.value && styles.chipActive]}
          >
            <Text style={[styles.chipText, type === t.value && styles.chipTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.chipRow}>
        <Pressable
          onPress={() => setPriority(null)}
          accessibilityRole="button"
          accessibilityLabel="Priority None"
          style={[styles.chip, priority === null && styles.chipActive]}
        >
          <Text style={[styles.chipText, priority === null && styles.chipTextActive]}>None</Text>
        </Pressable>
        {(['low', 'medium', 'high'] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => setPriority(p)}
            accessibilityRole="button"
            accessibilityLabel={`Priority ${p}`}
            style={[styles.chip, priority === p && styles.chipActive]}
          >
            <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>
              {priorityLabel[p]}
            </Text>
          </Pressable>
        ))}
      </View>
      {type === 'task' ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Repeat</Text>
          <RecurrenceControl value={recurrence} onChange={setRecurrence} />
        </View>
      ) : null}
      <View style={styles.section}>
        <ProjectSelector
          value={suggestion.projectId}
          onChange={(projectId) => {
            const project = projects.find((p) => p.id === projectId)
            onChange({ projectId, projectName: project?.name ?? null })
          }}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Tags</Text>
        <TagInput tags={tags} onChange={setTags} accessibilityLabel="Suggestion tags" />
      </View>
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
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    maxHeight: '90%',
    paddingBottom: spacing.xl,
  },
  content: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  heading: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  close: {
    padding: 6,
  },
  closeText: {
    color: colors.textMuted,
    fontSize: 16,
  },
  state: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.lg,
  },
  stateText: {
    color: colors.textMuted,
    fontSize: 15,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  stateTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  stateSub: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  stateOriginal: {
    color: colors.text,
    fontSize: 13,
    fontStyle: 'italic',
  },
  sourceCard: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sourceLabel: {
    color: colors.textFaint,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 4,
  },
  sourceTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  sourceBody: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4,
  },
  sourceMeta: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 8,
  },
  suggestionsLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.accent,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  check: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  cardBody: {
    flex: 1,
    minWidth: 0,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 2,
  },
  cardType: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardConfidence: {
    color: colors.textFaint,
    fontSize: 11,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  cardBodyText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tag: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.sm,
    paddingHorizontal: 7,
    paddingVertical: 2,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  iconButton: {
    padding: 6,
  },
  duplicateText: {
    color: colors.warning,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  errorText: {
    color: colors.warning,
    fontSize: 13,
    marginVertical: spacing.sm,
  },
  markRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: spacing.md,
  },
  markLabel: {
    color: colors.textMuted,
    fontSize: 13,
    flex: 1,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  primaryText: {
    color: colors.background,
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  secondaryText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.5,
  },
  editor: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  multiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.accent,
  },
  section: {
    marginTop: spacing.sm,
  },
  sectionLabel: {
    color: colors.textFaint,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.sm,
  },
})
