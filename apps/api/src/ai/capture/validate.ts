import type { CaptureConfidence, CaptureResult, ItemType, Priority, Recurrence } from '@kosh/shared'
import { ITEM_TYPES, isValidHttpUrl, PRIORITIES } from '@kosh/shared'
import { parseRecurrence } from '../../recurrence/validation.js'
import { CaptureValidationError } from '../types.js'

const MAX_TITLE = 500
const MAX_BODY = 10000
const MAX_TAGS = 5
const MAX_TAG_LENGTH = 50

const URL_PATTERN = /https?:\/\/[^\s<>"']+/g

function extractUrl(text: string): string | null {
  const matches = text.match(URL_PATTERN)
  if (!matches) return null
  for (const candidate of matches) {
    const cleaned = candidate.replace(/[.,;:!?]+$/, '')
    if (isValidHttpUrl(cleaned)) return cleaned
  }
  return null
}

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

export function validateCaptureOutput(raw: string, originalText: string): CaptureResult {
  const output = parseJson(raw)

  const type: ItemType = (ITEM_TYPES as readonly string[]).includes(String(output.type))
    ? (output.type as ItemType)
    : 'note'

  const aiTitle = typeof output.title === 'string' ? output.title.trim() : ''
  const title =
    aiTitle.length > 0 ? aiTitle.slice(0, MAX_TITLE) : originalText.trim().slice(0, MAX_TITLE)
  const titleFellBack = title === originalText.trim().slice(0, MAX_TITLE)

  const rawBody = typeof output.body === 'string' ? output.body.trim() : ''
  const body = rawBody.length > 0 ? rawBody.slice(0, MAX_BODY) : null

  let url: string | null = null
  if (typeof output.url === 'string' && isValidHttpUrl(output.url.trim())) {
    url = output.url.trim()
  }

  let effectiveType = type
  if (effectiveType === 'link' && !url) {
    const fromText = extractUrl(originalText)
    if (fromText) {
      url = fromText
    } else {
      effectiveType = 'note'
    }
  }
  if (url && !isValidHttpUrl(url)) url = null

  const priority: Priority | null =
    output.priority !== null && (PRIORITIES as readonly string[]).includes(String(output.priority))
      ? (output.priority as Priority)
      : null

  let dueAt: string | null = null
  if (typeof output.dueAt === 'string' && !Number.isNaN(Date.parse(output.dueAt))) {
    dueAt = new Date(output.dueAt).toISOString()
  }

  let reminderAt: string | null = null
  if (typeof output.reminderAt === 'string' && !Number.isNaN(Date.parse(output.reminderAt))) {
    reminderAt = new Date(output.reminderAt).toISOString()
  }
  if (dueAt && reminderAt && new Date(reminderAt).getTime() > new Date(dueAt).getTime()) {
    reminderAt = null
  }

  let tags: string[] | null = null
  if (Array.isArray(output.tags)) {
    const cleaned: string[] = []
    for (const tag of output.tags) {
      if (typeof tag !== 'string') continue
      const t = tag.trim()
      if (!t || t.length > MAX_TAG_LENGTH) continue
      cleaned.push(t)
      if (cleaned.length >= MAX_TAGS) break
    }
    tags = cleaned.length > 0 ? cleaned : null
  }

  const confidence: CaptureConfidence = ['high', 'medium', 'low'].includes(
    String(output.confidence),
  )
    ? (output.confidence as CaptureConfidence)
    : 'medium'

  let recurrence: Recurrence | null = null
  if (effectiveType === 'task') {
    try {
      const parsed = parseRecurrence(output.recurrence)
      if (parsed) recurrence = parsed
    } catch {
      recurrence = null
    }
    if (recurrence && recurrence.frequency !== 'none' && !dueAt) {
      recurrence = null
    }
  }

  return {
    type: effectiveType,
    title: title || 'Untitled capture',
    body,
    url,
    priority,
    dueAt,
    reminderAt,
    tags,
    recurrence,
    confidence: titleFellBack ? 'low' : confidence,
  }
}
