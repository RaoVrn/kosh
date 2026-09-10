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
  priority?: Priority | null
  tags?: string[] | null
  createdAt: string
  updatedAt: string
  doneAt?: string | null
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
