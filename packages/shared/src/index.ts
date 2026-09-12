export * from './theme'
export * from './utils/time'
export * from './utils/labels'
export * from './utils/search'
export * from './utils/url'
export * from './utils/grouping'
export * from './utils/id'
export * from './screens'
export { createMockItems } from './mockData'
export * from './api/itemsApi'
export * from './react/ItemsContext'
export * from './react/NotificationsContext'
export * from './react/useServerSearch'
export * from './react/useSmartCapture'

export type ItemType = 'task' | 'note' | 'idea' | 'learning' | 'link'

export type ItemStatus = 'inbox' | 'active' | 'done' | 'archived'

export type Priority = 'low' | 'medium' | 'high'

export const ITEM_TYPES: readonly ItemType[] = ['task', 'note', 'idea', 'learning', 'link']

export const ITEM_STATUSES: readonly ItemStatus[] = ['inbox', 'active', 'done', 'archived']

export const PRIORITIES: readonly Priority[] = ['low', 'medium', 'high']

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
  createdAt: string
  updatedAt: string
  doneAt?: string | null
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
