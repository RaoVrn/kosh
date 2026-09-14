import type {
  InboxProcessingResult,
  InboxProcessingSuggestion,
  ItemType,
  Priority,
  Recurrence,
} from '@kosh/shared'
import { ITEM_TYPES, isValidHttpUrl, PRIORITIES } from '@kosh/shared'
import { parseRecurrence } from '../../recurrence/validation.js'
import { CaptureValidationError } from '../types.js'

const MAX_SUGGESTIONS = 5
const MAX_TITLE = 500
const MAX_BODY = 10000
const MAX_TAGS = 5
const MAX_TAG_LENGTH = 50
const MAX_PROJECT_NAME = 120

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseJson(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw)
    if (isRecord(parsed)) return parsed
  } catch {
    // fall through to tolerant extraction
  }
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      const parsed: unknown = JSON.parse(raw.slice(start, end + 1))
      if (isRecord(parsed)) return parsed
    } catch {
      // fall through
    }
  }
  throw new CaptureValidationError('The AI returned invalid output')
}

function cleanTags(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  const cleaned: string[] = []
  for (const tag of value) {
    if (typeof tag !== 'string') continue
    const t = tag.trim()
    if (!t || t.length > MAX_TAG_LENGTH) continue
    if (!cleaned.includes(t)) cleaned.push(t)
    if (cleaned.length >= MAX_TAGS) break
  }
  return cleaned.length > 0 ? cleaned : null
}

export function validateProcessingOutput(raw: string, sourceText: string): InboxProcessingResult {
  const output = parseJson(raw)

  const summary =
    typeof output.summary === 'string' && output.summary.trim()
      ? output.summary.trim().slice(0, 500)
      : null

  const rawSuggestions = Array.isArray(output.suggestions) ? output.suggestions : []
  const suggestions: InboxProcessingSuggestion[] = []
  const seenTitles = new Set<string>()

  for (const raw of rawSuggestions.slice(0, MAX_SUGGESTIONS)) {
    if (!isRecord(raw)) continue

    const type: ItemType = (ITEM_TYPES as readonly string[]).includes(String(raw.type))
      ? (raw.type as ItemType)
      : 'note'

    const rawTitle = typeof raw.title === 'string' ? raw.title.trim() : ''
    const title =
      rawTitle.length > 0 ? rawTitle.slice(0, MAX_TITLE) : sourceText.slice(0, MAX_TITLE)

    const normalized = title.toLowerCase()
    if (seenTitles.has(normalized)) continue
    seenTitles.add(normalized)

    const rawBody = typeof raw.body === 'string' ? raw.body.trim() : ''
    const body = rawBody.length > 0 ? rawBody.slice(0, MAX_BODY) : null

    const priority: Priority | null = (PRIORITIES as readonly string[]).includes(
      String(raw.priority),
    )
      ? (raw.priority as Priority)
      : null

    let projectName: string | null = null
    if (typeof raw.projectName === 'string') {
      const trimmed = raw.projectName.trim()
      if (trimmed.length > 0 && trimmed.length <= MAX_PROJECT_NAME) projectName = trimmed
    }

    let dueAt: string | null = null
    if (typeof raw.dueAt === 'string' && !Number.isNaN(Date.parse(raw.dueAt))) {
      dueAt = new Date(raw.dueAt).toISOString()
    }
    let reminderAt: string | null = null
    if (typeof raw.reminderAt === 'string' && !Number.isNaN(Date.parse(raw.reminderAt))) {
      reminderAt = new Date(raw.reminderAt).toISOString()
    }
    if (dueAt && reminderAt && new Date(reminderAt).getTime() > new Date(dueAt).getTime()) {
      reminderAt = null
    }

    let recurrence: Recurrence | null = null
    if (type === 'task') {
      try {
        const parsed = parseRecurrence(raw.recurrence)
        if (parsed && parsed.frequency !== 'none') recurrence = parsed
      } catch {
        recurrence = null
      }
      if (recurrence && !dueAt) recurrence = null
    }

    const confidence: InboxProcessingSuggestion['confidence'] = ['high', 'medium', 'low'].includes(
      String(raw.confidence),
    )
      ? (raw.confidence as InboxProcessingSuggestion['confidence'])
      : 'medium'

    const category =
      typeof raw.category === 'string' && raw.category.trim()
        ? raw.category.trim().slice(0, 100)
        : null

    suggestions.push({
      title,
      body,
      type,
      priority,
      projectName,
      projectId: null,
      dueAt,
      reminderAt,
      tags: cleanTags(raw.tags),
      recurrence,
      sourceText,
      confidence,
      category,
    })
  }

  void isValidHttpUrl
  return { summary, suggestions }
}
