import { useEffect, useMemo, useState } from 'react'
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
import { Icon } from './Icon'
import { Chip, DateTimeField } from './fields'
import { TagInput } from './TagInput'
import { RecurrenceControl } from './RecurrenceControl'
import { ProjectSelector } from './ProjectSelector'

type Status = 'processing' | 'error' | 'ready' | 'accepting' | 'success'

interface InboxProcessModalProps {
  item: Item
  onClose: () => void
  onDone: () => void
}

export function InboxProcessModal({ item, onClose, onDone }: InboxProcessModalProps) {
  const { client, refresh, items } = useItems()
  const [status, setStatus] = useState<Status>('processing')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<InboxProcessingResult | null>(null)
  const [suggestions, setSuggestions] = useState<InboxProcessingSuggestion[]>([])
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [skip, setSkip] = useState<Set<number>>(new Set())
  const [editing, setEditing] = useState<number | null>(null)
  const [markProcessed, setMarkProcessed] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [createdCount, setCreatedCount] = useState(0)

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
      .then((res) => {
        if (cancelled) return
        setResult(res)
        setSuggestions(res.suggestions)
        setSelected(new Set(res.suggestions.map((_, i) => i)))
        setSkip(
          new Set(
            res.suggestions
              .map((s, i) => (existingTitles.has(s.title.trim().toLowerCase()) ? i : -1))
              .filter((i) => i >= 0),
          ),
        )
        setMarkProcessed(true)
        setStatus('ready')
      })
      .catch((err) => {
        if (cancelled) return
        setError(errorMessage(err, "Couldn't process this capture. Your original item is safe."))
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [client, item.id, existingTitles])

  const updateSuggestion = (index: number, patch: Partial<InboxProcessingSuggestion>) => {
    setSuggestions((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)))
  }

  const accept = async (targets: number[]) => {
    if (targets.length === 0) return
    setStatus('accepting')
    setError(null)
    setMessage(null)
    try {
      const accepted = targets
        .map((i) => suggestions[i])
        .filter((s): s is InboxProcessingSuggestion => s !== undefined)
      const response = await client.acceptProcessedSuggestions(item.id, {
        suggestions: accepted,
        markSourceProcessed: markProcessed,
        skipDuplicateTitles: accepted
          .map((s, i) => (skip.has(targets[i]!) ? s.title : null))
          .filter((t): t is string => t !== null),
      })
      setCreatedCount(response.created.length)
      setStatus('success')
      setMessage(
        response.skippedDuplicates.length > 0
          ? `${response.created.length} item${response.created.length === 1 ? '' : 's'} created. Skipped duplicates: ${response.skippedDuplicates.join(', ')}.`
          : null,
      )
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

  const toggleSkip = (index: number) => {
    setSkip((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const selectedCount = selected.size

  useEffect(() => {
    if (status === 'ready') {
      setMarkProcessed(selected.size === suggestions.length && suggestions.length > 0)
    }
  }, [status, selected.size, suggestions.length])

  const attachmentCount = item.attachmentCount ?? 0

  return (
    <div
      className="overlay"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && status !== 'accepting') onClose()
      }}
    >
      <div
        className="modal process-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Process capture"
      >
        <div className="modal-header">
          <h2 className="modal-title-header">Process capture</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            disabled={status === 'accepting'}
            aria-label="Close"
          >
            <Icon name="x" size={20} />
          </button>
        </div>

        {status === 'processing' ? (
          <div className="smart-state">
            <Icon name="zap" size={26} color="var(--accent)" />
            <p className="smart-state-title">Kosh is reviewing this capture…</p>
            <p className="smart-state-sub">Your original item is safe.</p>
          </div>
        ) : status === 'error' ? (
          <div className="smart-state">
            <Icon name="alert-circle" size={26} color="var(--warning)" />
            <p className="smart-state-title">Couldn't process this capture.</p>
            <p className="smart-state-sub">{error}</p>
            <p className="smart-state-original">"{item.title}"</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary btn-block"
                onClick={() => {
                  setStatus('processing')
                  setError(null)
                  void client
                    .processInboxItem(item.id)
                    .then((res) => {
                      setResult(res)
                      setSuggestions(res.suggestions)
                      setSelected(new Set(res.suggestions.map((_, i) => i)))
                      setStatus('ready')
                    })
                    .catch((err) => {
                      setError(
                        errorMessage(
                          err,
                          "Couldn't process this capture. Your original item is safe.",
                        ),
                      )
                      setStatus('error')
                    })
                }}
              >
                Try again
              </button>
              <button type="button" className="btn-secondary btn-block" onClick={onClose}>
                Cancel
              </button>
            </div>
          </div>
        ) : status === 'success' ? (
          <div className="smart-state">
            <Icon name="check" size={26} color="var(--accent)" />
            <p className="smart-state-title">
              {createdCount} item{createdCount === 1 ? '' : 's'} created
            </p>
            {message ? <p className="smart-state-sub">{message}</p> : null}
            <div className="modal-actions">
              <button type="button" className="btn-primary btn-block" onClick={onDone}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="process-source">
              <div className="process-source-label">Original capture</div>
              <p className="process-source-title">{item.title}</p>
              {item.body ? <p className="process-source-body">{item.body}</p> : null}
              {attachmentCount > 0 ? (
                <p className="process-source-meta">
                  <Icon name="paperclip" size={11} />
                  {attachmentCount} attachment{attachmentCount === 1 ? '' : 's'} — kept on this
                  capture
                </p>
              ) : null}
            </div>

            <div className="process-suggestions-label">
              Suggested actions ({suggestions.length})
            </div>

            <div className="process-suggestions">
              {suggestions.map((s, i) => {
                const isSelected = selected.has(i)
                const isDuplicate = existingTitles.has(s.title.trim().toLowerCase())
                const isSkipped = skip.has(i)
                return (
                  <div key={i} className={`process-card${isSelected ? ' selected' : ''}`}>
                    <div className="process-card-row">
                      <label className="process-check">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelected(i)}
                          aria-label={`Select ${s.title}`}
                        />
                        <span className={`check${isSelected ? ' done' : ''}`}>
                          {isSelected ? <Icon name="check" size={12} color="#0b0b0f" /> : null}
                        </span>
                      </label>
                      <div className="process-card-body">
                        <div className="process-card-head">
                          <span className="process-type">{typeLabel[s.type]}</span>
                          <span className="process-confidence confidence-low">{s.confidence}</span>
                        </div>
                        {editing === i ? (
                          <SuggestionEditor
                            suggestion={s}
                            onChange={(patch) => updateSuggestion(i, patch)}
                          />
                        ) : (
                          <>
                            <p className="process-title">{s.title}</p>
                            {s.body ? <p className="process-body">{s.body}</p> : null}
                            <div className="process-meta">
                              {s.projectId || s.projectName ? (
                                <span className="tag">↳ {s.projectName ?? 'project'}</span>
                              ) : null}
                              {s.dueAt ? <span className="tag">{formatDue(s.dueAt)}</span> : null}
                              {s.priority ? (
                                <span className="tag">{priorityLabel[s.priority]}</span>
                              ) : null}
                              {s.recurrence && s.recurrence.frequency !== 'none' ? (
                                <span className="tag">{recurrenceLabel(s.recurrence)}</span>
                              ) : null}
                              {(s.tags ?? []).map((t) => (
                                <span key={t} className="tag">
                                  {t}
                                </span>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="process-card-actions">
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => setEditing(editing === i ? null : i)}
                          aria-label={editing === i ? `Done editing ${s.title}` : `Edit ${s.title}`}
                        >
                          <Icon name={editing === i ? 'check' : 'file-text'} size={15} />
                        </button>
                        <button
                          type="button"
                          className="icon-btn"
                          onClick={() => {
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
                          aria-label={`Remove ${s.title}`}
                        >
                          <Icon name="trash" size={15} />
                        </button>
                      </div>
                    </div>
                    {isDuplicate ? (
                      <div className="process-duplicate">
                        <span>Similar item already exists.</span>
                        <button type="button" className="card-action" onClick={() => toggleSkip(i)}>
                          {isSkipped ? 'Create anyway' : 'Skip'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {error ? (
              <p className="modal-meta error-text">{error} — your original item is safe.</p>
            ) : null}

            <label className="process-mark">
              <input
                type="checkbox"
                checked={markProcessed}
                onChange={(e) => setMarkProcessed(e.target.checked)}
              />
              Mark original capture as processed (archive it)
            </label>

            <div className="modal-actions">
              <button
                type="button"
                className="btn-primary btn-block"
                disabled={selectedCount === 0 || status === 'accepting'}
                onClick={() => void accept([...selected])}
              >
                {status === 'accepting'
                  ? 'Creating…'
                  : `Accept selected (${selectedCount} of ${suggestions.length})`}
              </button>
              {selectedCount < suggestions.length ? (
                <button
                  type="button"
                  className="btn-secondary btn-block"
                  disabled={status === 'accepting'}
                  onClick={() => void accept(suggestions.map((_, i) => i))}
                >
                  Accept all
                </button>
              ) : null}
              <button
                type="button"
                className="btn-secondary btn-block"
                onClick={onClose}
                disabled={status === 'accepting'}
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SuggestionEditor({
  suggestion,
  onChange,
}: {
  suggestion: InboxProcessingSuggestion
  onChange: (patch: Partial<InboxProcessingSuggestion>) => void
}) {
  const [title, setTitle] = useState(suggestion.title)
  const [body, setBody] = useState(suggestion.body ?? '')
  const [type, setType] = useState<ItemType>(suggestion.type)
  const [priority, setPriority] = useState<Priority | null>(suggestion.priority)
  const [dueAt, setDueAt] = useState<string | null>(suggestion.dueAt)
  const [reminderAt, setReminderAt] = useState<string | null>(suggestion.reminderAt)
  const [tags, setTags] = useState<string[]>(suggestion.tags ?? [])
  const [recurrence, setRecurrence] = useState<Recurrence | null>(suggestion.recurrence)

  useEffect(() => {
    onChange({
      title,
      body: body || null,
      type,
      priority,
      dueAt,
      reminderAt,
      tags,
      recurrence,
    })
  }, [title, body, type, priority, dueAt, reminderAt, tags, recurrence])

  return (
    <div className="process-editor">
      <input
        className="modal-title-input"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        aria-label="Suggestion title"
      />
      <textarea
        className="modal-body-input"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={2}
        placeholder="Details…"
        aria-label="Suggestion body"
      />
      <div className="modal-section">
        <div className="modal-label">Type</div>
        <div className="chip-row">
          {(['task', 'note', 'idea', 'learning', 'link'] as const).map((t) => (
            <Chip key={t} label={typeLabel[t]} active={type === t} onPress={() => setType(t)} />
          ))}
        </div>
      </div>
      <div className="modal-section">
        <div className="modal-label">Priority</div>
        <div className="chip-row">
          <Chip label="None" active={!priority} onPress={() => setPriority(null)} />
          {(['low', 'medium', 'high'] as const).map((p) => (
            <Chip
              key={p}
              label={priorityLabel[p]}
              active={priority === p}
              onPress={() => setPriority(p)}
            />
          ))}
        </div>
      </div>
      {type === 'task' ? (
        <>
          <DateTimeField
            label="Due"
            value={dueAt}
            onChange={setDueAt}
            quick={[{ label: 'None', value: null }]}
            ariaLabel="Due date and time"
          />
          <DateTimeField
            label="Reminder"
            value={reminderAt}
            onChange={setReminderAt}
            quick={[{ label: 'None', value: null }]}
            ariaLabel="Reminder date and time"
          />
          <div className="modal-section">
            <div className="modal-label">Repeat</div>
            <RecurrenceControl value={recurrence} onChange={setRecurrence} />
          </div>
        </>
      ) : null}
      <div className="modal-section">
        <div className="modal-label">Project</div>
        <ProjectSelector
          value={suggestion.projectId}
          onChange={(projectId) => {
            const name = useProjectNameFor(projectId)
            onChange({ projectId, projectName: name })
          }}
        />
      </div>
      <div className="modal-section">
        <div className="modal-label">Tags</div>
        <TagInput tags={tags} onChange={setTags} ariaLabel="Suggestion tags" />
      </div>
    </div>
  )
}

function useProjectNameFor(projectId: string | null): string | null {
  const { projects } = useProjects()
  if (!projectId) return null
  return projects.find((p) => p.id === projectId)?.name ?? null
}
