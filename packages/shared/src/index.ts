export * from './theme'
export * from './utils/time'
export * from './utils/labels'
export * from './utils/search'
export * from './utils/url'
export * from './utils/grouping'
export * from './utils/id'
export * from './utils/recentSearches'
export * from './utils/recurrence'
export * from './screens'

import type { Recurrence } from './utils/recurrence'

export { createMockItems } from './mockData'
export * from './api/itemsApi'
export * from './react/ItemsContext'
export * from './react/ProjectsContext'
export * from './react/NotificationsContext'
export * from './react/useServerSearch'
export * from './react/useSmartCapture'

export type ItemType = 'task' | 'note' | 'idea' | 'learning' | 'link'

export type ItemStatus = 'inbox' | 'active' | 'done' | 'archived'

export type Priority = 'low' | 'medium' | 'high'

export const ITEM_TYPES: readonly ItemType[] = ['task', 'note', 'idea', 'learning', 'link']

export const ITEM_STATUSES: readonly ItemStatus[] = ['inbox', 'active', 'done', 'archived']

export const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high']

export interface Attachment {
  id: string
  itemId: string
  originalName: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  updatedAt: string
}

export interface Item {
  id: string
  type: ItemType
  status: ItemStatus
  title: string
  body?: string | null
  url?: string | null
  dueAt?: string | null
  reminderAt?: string | null
  remindedAt?: string | null
  priority?: Priority | null
  tags?: string[] | null
  recurrence?: Recurrence | null
  recurrenceId?: string | null
  projectId?: string | null
  attachments?: Attachment[]
  attachmentCount?: number
  snippet?: string | null
  createdAt: string
  updatedAt: string
  doneAt?: string | null
}

export interface Project {
  id: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
  archivedAt?: string | null
}

export interface ProjectInput {
  name: string
  description?: string | null
}

export type ProjectUpdate = Partial<ProjectInput> & { archivedAt?: string | null }

export interface SearchMeta {
  limit: number
  offset: number
  total: number
  hasMore: boolean
}

export interface SearchResponse {
  items: Item[]
  meta: SearchMeta
}

export interface InboxProcessingSuggestion {
  title: string
  body: string | null
  type: ItemType
  priority: Priority | null
  projectName: string | null
  projectId: string | null
  dueAt: string | null
  reminderAt: string | null
  tags: string[] | null
  recurrence: Recurrence | null
  sourceText: string
  confidence: CaptureConfidence
  category: string | null
}

export interface InboxProcessingResult {
  summary: string | null
  suggestions: InboxProcessingSuggestion[]
}

export interface InboxProcessingAcceptInput {
  suggestions: Array<Omit<InboxProcessingSuggestion, 'sourceText' | 'confidence' | 'category'>>
  markSourceProcessed?: boolean
  skipDuplicateTitles?: string[]
}

export interface InboxProcessingAcceptResponse {
  created: Item[]
  source: Item
  skippedDuplicates: string[]
}

export interface KoshNotification {
  id: string
  itemId: string | null
  type: string
  title: string
  body?: string | null
  createdAt: string
  readAt?: string | null
}

export type NewItem = Pick<Item, 'title'> &
  Partial<Omit<Item, 'id' | 'title' | 'createdAt' | 'updatedAt'>>

export type ItemUpdate = Partial<Omit<Item, 'id' | 'createdAt' | 'updatedAt'>>

export interface ApiError {
  error: {
    message: string
  }
}

export interface HealthResponse {
  status: 'ok'
  db: 'ok'
}

export type CaptureConfidence = 'high' | 'medium' | 'low'

export interface CaptureResult {
  type: ItemType
  title: string
  body: string | null
  url: string | null
  priority: Priority | null
  dueAt: string | null
  reminderAt: string | null
  tags: string[] | null
  recurrence?: Recurrence | null
  projectId?: string | null
  projectName?: string | null
  confidence: CaptureConfidence
}

export interface CaptureInterpretRequest {
  text: string
  timezone?: string
  currentTime?: string
}

export interface CaptureInterpretResponse {
  data: CaptureResult
}

export interface TranscribeResponse {
  data: {
    text: string
  }
}
