import type { ItemStatus, ItemType, Priority } from '../index'

export const typeLabel: Record<ItemType, string> = {
  task: 'Task',
  note: 'Note',
  idea: 'Idea',
  learning: 'Learning',
  link: 'Link',
}

export const statusLabel: Record<ItemStatus, string> = {
  inbox: 'Inbox',
  active: 'Active',
  done: 'Done',
  archived: 'Archived',
}

export const learningStatusLabel: Record<ItemStatus, string> = {
  inbox: 'Not started',
  active: 'In progress',
  done: 'Completed',
  archived: 'Archived',
}

export const priorityLabel: Record<Priority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}
