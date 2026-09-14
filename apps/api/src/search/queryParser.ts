import type { ItemStatus, ItemType } from '@kosh/shared'
import { ITEM_STATUSES, ITEM_TYPES } from '@kosh/shared'
import { ValidationError } from '../items/validation.js'

export interface ParsedSearchQuery {
  textTerms: string[]
  phrases: string[]
  type?: ItemType
  status?: ItemStatus
  project?: string
  tags: string[]
  before?: string
  after?: string
  hasAttachment: boolean
}

export class SearchValidationError extends ValidationError {}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

function fail(message: string): never {
  throw new SearchValidationError(message)
}

function parseDate(value: string, operator: string): string {
  const match = value.match(DATE_PATTERN)
  if (!match) fail(`Invalid date for ${operator}: use YYYY-MM-DD`)
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    fail(`Invalid date for ${operator}: use YYYY-MM-DD`)
  }
  const boundary = new Date(Date.UTC(year, month - 1, day))
  if (Number.isNaN(boundary.getTime())) fail(`Invalid date for ${operator}: use YYYY-MM-DD`)
  return boundary.toISOString()
}

/**
 * Parses the Kosh search query syntax.
 * Operators (case-insensitive): type:, status:, project:, tag:, before:,
 * after:, has:attachment. Quoted values are supported for project names.
 * Invalid type/status/date values raise a SearchValidationError (HTTP 400).
 */
export function parseSearchQuery(raw: string): ParsedSearchQuery {
  const parsed: ParsedSearchQuery = {
    textTerms: [],
    phrases: [],
    tags: [],
    hasAttachment: false,
  }

  const tokens = raw.match(/(?:project:"([^"]*)")|("[^"]*")|(\S+)/g) ?? []
  for (const token of tokens) {
    const lower = token.toLowerCase()

    if (lower === 'has:attachment') {
      parsed.hasAttachment = true
      continue
    }

    const quotedProject = token.match(/^project:"([^"]*)"$/i)
    if (quotedProject) {
      parsed.project = quotedProject[1]!.trim()
      continue
    }

    const typeMatch = token.match(/^type:([a-z]+)$/i)
    if (typeMatch) {
      const value = typeMatch[1]!.toLowerCase()
      if (!(ITEM_TYPES as readonly string[]).includes(value)) {
        fail(`Invalid type filter: ${value}`)
      }
      parsed.type = value as ItemType
      continue
    }

    const statusMatch = token.match(/^status:([a-z]+)$/i)
    if (statusMatch) {
      const value = statusMatch[1]!.toLowerCase()
      if (!(ITEM_STATUSES as readonly string[]).includes(value)) {
        fail(`Invalid status filter: ${value}`)
      }
      parsed.status = value as ItemStatus
      continue
    }

    const projectMatch = token.match(/^project:([^\s]+)$/i)
    if (projectMatch) {
      parsed.project = projectMatch[1]!
      continue
    }

    const tagMatch = token.match(/^tag:([^\s]+)$/i)
    if (tagMatch) {
      parsed.tags.push(tagMatch[1]!)
      continue
    }

    const beforeMatch = token.match(/^before:([^\s]+)$/i)
    if (beforeMatch) {
      parsed.before = parseDate(beforeMatch[1]!, 'before')
      continue
    }

    const afterMatch = token.match(/^after:([^\s]+)$/i)
    if (afterMatch) {
      parsed.after = parseDate(afterMatch[1]!, 'after')
      continue
    }

    if (lower.startsWith('type:') || lower.startsWith('status:') || lower.startsWith('project:')) {
      // operator without a value — treat as normal text rather than crashing
      parsed.textTerms.push(token)
      continue
    }

    if (token.startsWith('"') && token.endsWith('"') && token.length >= 2) {
      parsed.phrases.push(token.slice(1, -1).replace(/"/g, ' ').trim())
    } else {
      parsed.textTerms.push(token)
    }
  }

  return parsed
}

export function hasStructuredFilters(parsed: ParsedSearchQuery): boolean {
  return (
    parsed.type !== undefined ||
    parsed.status !== undefined ||
    parsed.project !== undefined ||
    parsed.tags.length > 0 ||
    parsed.before !== undefined ||
    parsed.after !== undefined ||
    parsed.hasAttachment
  )
}
