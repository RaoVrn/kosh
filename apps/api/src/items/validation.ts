import { ITEM_STATUSES, ITEM_TYPES, PRIORITIES } from '@kosh/shared'
import type { ItemStatus, ItemType, Priority } from '@kosh/shared'
import type { CreateItemData, UpdateItemData } from './repo.js'

const MAX_TITLE = 500
const MAX_BODY = 10000
const MAX_URL = 2000
const MAX_TAGS = 50
const MAX_TAG_LENGTH = 100
const MAX_ID_LENGTH = 100

export class ValidationError extends Error {}

function fail(message: string): never {
  throw new ValidationError(message)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isItemType(value: unknown): value is ItemType {
  return typeof value === 'string' && (ITEM_TYPES as readonly string[]).includes(value)
}

export function isItemStatus(value: unknown): value is ItemStatus {
  return typeof value === 'string' && (ITEM_STATUSES as readonly string[]).includes(value)
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value)
}

export function isValidIsoDate(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false
  return !Number.isNaN(Date.parse(value))
}

export function assertReminderRules(
  type: ItemType,
  dueAt: string | null | undefined,
  reminderAt: string | null | undefined,
): void {
  if (!reminderAt) return
  if (type !== 'task') fail('reminders are only supported on tasks')
  if (dueAt && new Date(reminderAt).getTime() > new Date(dueAt).getTime()) {
    fail('reminder must not be after the due time')
  }
}

export function parseId(value: string): string {
  const id = value.trim()
  if (!id) fail('A valid item id is required')
  if (id.length > MAX_ID_LENGTH) fail('Item id is too long')
  return id
}

function optionalString(
  value: unknown,
  label: string,
  maxLength: number,
): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (typeof value !== 'string') fail(`${label} must be a string`)
  if (value.length > maxLength) fail(`${label} is too long`)
  return value
}

function optionalIso(value: unknown, label: string): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (!isValidIsoDate(value)) fail(`${label} must be a valid ISO-8601 date`)
  return value
}

function optionalTags(value: unknown): string[] | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  if (!Array.isArray(value)) fail('tags must be an array of strings')
  if (value.length > MAX_TAGS) fail('too many tags')
  const tags: string[] = []
  for (const tag of value) {
    if (typeof tag !== 'string') fail('tags must be an array of strings')
    const trimmed = tag.trim()
    if (!trimmed) continue
    if (trimmed.length > MAX_TAG_LENGTH) fail('a tag is too long')
    tags.push(trimmed)
  }
  return tags
}

export function parseCreateBody(body: unknown): CreateItemData {
  if (!isRecord(body)) fail('Request body must be a JSON object')

  if (typeof body.title !== 'string' || body.title.trim() === '') {
    fail('title is required')
  }
  const title = body.title.trim()
  if (title.length > MAX_TITLE) fail('title is too long')

  if (!isItemType(body.type)) fail(`type must be one of: ${ITEM_TYPES.join(', ')}`)

  let status: ItemStatus = 'inbox'
  if (body.status !== undefined) {
    if (!isItemStatus(body.status)) fail(`status must be one of: ${ITEM_STATUSES.join(', ')}`)
    status = body.status
  }

  let priority: Priority | null = null
  if (body.priority !== undefined && body.priority !== null) {
    if (!isPriority(body.priority)) fail(`priority must be one of: ${PRIORITIES.join(', ')}`)
    priority = body.priority
  }

  const bodyText = optionalString(body.body, 'body', MAX_BODY)
  const url = optionalString(body.url, 'url', MAX_URL)
  const dueAt = optionalIso(body.dueAt, 'dueAt')
  const reminderAt = optionalIso(body.reminderAt, 'reminderAt')
  const tags = optionalTags(body.tags)

  assertReminderRules(body.type, dueAt, reminderAt)

  return {
    title,
    type: body.type,
    status,
    priority,
    body: bodyText ?? null,
    url: url ?? null,
    dueAt: dueAt ?? null,
    reminderAt: reminderAt ?? null,
    tags: tags ?? null,
  }
}

export function parsePatchBody(body: unknown): UpdateItemData {
  if (!isRecord(body)) fail('Request body must be a JSON object')

  const patch: UpdateItemData = {}

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim() === '')
      fail('title must be a non-empty string')
    const title = body.title.trim()
    if (title.length > MAX_TITLE) fail('title is too long')
    patch.title = title
  }
  if (body.type !== undefined) {
    if (!isItemType(body.type)) fail(`type must be one of: ${ITEM_TYPES.join(', ')}`)
    patch.type = body.type
  }
  if (body.status !== undefined) {
    if (!isItemStatus(body.status)) fail(`status must be one of: ${ITEM_STATUSES.join(', ')}`)
    patch.status = body.status
  }
  if (body.priority !== undefined) {
    if (body.priority !== null && !isPriority(body.priority)) {
      fail(`priority must be one of: ${PRIORITIES.join(', ')}`)
    }
    patch.priority = body.priority as Priority | null
  }

  const bodyText = optionalString(body.body, 'body', MAX_BODY)
  const url = optionalString(body.url, 'url', MAX_URL)
  const dueAt = optionalIso(body.dueAt, 'dueAt')
  const reminderAt = optionalIso(body.reminderAt, 'reminderAt')
  const tags = optionalTags(body.tags)

  if (bodyText !== undefined) patch.body = bodyText
  if (url !== undefined) patch.url = url
  if (dueAt !== undefined) patch.dueAt = dueAt
  if (reminderAt !== undefined) patch.reminderAt = reminderAt
  if (tags !== undefined) patch.tags = tags

  if (Object.keys(patch).length === 0) fail('No fields to update')

  return patch
}
