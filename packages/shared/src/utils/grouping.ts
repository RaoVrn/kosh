import type { Item, KoshNotification } from '../index'
import { isOverdue, isToday } from './time'

export interface TaskGroup {
  key: 'overdue' | 'today' | 'upcoming' | 'completed'
  title: string
  items: Item[]
}

export interface TodayCommandCenter {
  overdue: Item[]
  dueToday: Item[]
  upNext: Item[]
  reminders: KoshNotification[]
  recentCaptures: Item[]
}

export interface TodayCommandCenterLimits {
  upNext: number
  reminders: number
  recentCaptures: number
}

const DEFAULT_LIMITS: TodayCommandCenterLimits = { upNext: 5, reminders: 3, recentCaptures: 3 }

export function isPendingTask(item: Item): boolean {
  return item.type === 'task' && item.status !== 'done' && item.status !== 'archived'
}

export function getTodayCommandCenter(
  items: Item[],
  notifications: KoshNotification[],
  ref: Date = new Date(),
  limits: TodayCommandCenterLimits = DEFAULT_LIMITS,
): TodayCommandCenter {
  const pending = items.filter(isPendingTask)

  const overdue = pending.filter((i) => i.dueAt && isOverdue(i.dueAt, ref)).sort(compareTasks)
  const overdueIds = new Set(overdue.map((i) => i.id))

  const dueToday = pending
    .filter((i) => i.dueAt && isToday(i.dueAt, ref) && !overdueIds.has(i.id))
    .sort(compareTasks)
  const dueTodayIds = new Set(dueToday.map((i) => i.id))

  const upNext = pending
    .filter((i) => !overdueIds.has(i.id) && !dueTodayIds.has(i.id))
    .sort(compareTasks)
    .slice(0, limits.upNext)

  const reminders = notifications
    .filter((n) => !n.readAt)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limits.reminders)

  const recentCaptures = items
    .filter((i) => i.status === 'inbox')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limits.recentCaptures)

  return { overdue, dueToday, upNext, reminders, recentCaptures }
}

export interface TaskGroups {
  overdue: Item[]
  today: Item[]
  upcoming: Item[]
  nodue: Item[]
  completed: Item[]
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 }

export function byDueAt(a: Item, b: Item): number {
  if (!a.dueAt) return 1
  if (!b.dueAt) return -1
  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
}

export function compareTasks(a: Item, b: Item): number {
  const pa = PRIORITY_ORDER[a.priority ?? 'low'] ?? 2
  const pb = PRIORITY_ORDER[b.priority ?? 'low'] ?? 2
  if (pa !== pb) return pa - pb
  return byDueAt(a, b)
}

export function getTaskGroups(items: Item[], ref: Date = new Date()): TaskGroups {
  const pending = items.filter(isPendingTask)

  const overdue = pending.filter((i) => i.dueAt && isOverdue(i.dueAt, ref)).sort(compareTasks)

  const today = pending
    .filter((i) => i.dueAt && isToday(i.dueAt, ref) && !isOverdue(i.dueAt, ref))
    .sort(compareTasks)

  const upcoming = pending
    .filter((i) => i.dueAt && !isToday(i.dueAt, ref) && !isOverdue(i.dueAt, ref))
    .sort(byDueAt)
    .slice(0, 8)

  const nodue = pending.filter((i) => !i.dueAt).sort(compareTasks)

  const completed = items
    .filter((i) => i.type === 'task' && i.status === 'done')
    .sort((a, b) => (b.doneAt ?? b.updatedAt).localeCompare(a.doneAt ?? a.updatedAt))

  return { overdue, today, upcoming, nodue, completed }
}

export function getTodayGroups(items: Item[], ref: Date = new Date()): TaskGroup[] {
  const { overdue, today, upcoming } = getTaskGroups(items, ref)
  const completedToday = items
    .filter((i) => i.type === 'task' && i.status === 'done' && i.doneAt && isToday(i.doneAt, ref))
    .sort((a, b) => (b.doneAt ?? '').localeCompare(a.doneAt ?? ''))

  const groups: TaskGroup[] = []
  if (overdue.length) groups.push({ key: 'overdue', title: 'Overdue', items: overdue })
  if (today.length) groups.push({ key: 'today', title: 'Today', items: today })
  if (upcoming.length) groups.push({ key: 'upcoming', title: 'Upcoming', items: upcoming })
  if (completedToday.length)
    groups.push({ key: 'completed', title: 'Completed', items: completedToday })
  return groups
}

export function sortPendingTasks(items: Item[]): Item[] {
  return items
    .filter((i) => i.type === 'task')
    .sort((a, b) => {
      const aDone = a.status === 'done' ? 1 : 0
      const bDone = b.status === 'done' ? 1 : 0
      if (aDone !== bDone) return aDone - bDone
      return byDueAt(a, b)
    })
}

export interface LearningGroups {
  highPriority: Item[]
  active: Item[]
  notStarted: Item[]
  completed: Item[]
}

export function getLearningGroups(items: Item[]): LearningGroups {
  const learning = items.filter((i) => i.type === 'learning')

  const highPriority = learning
    .filter((i) => i.priority === 'high' && i.status !== 'done')
    .sort(compareTasks)

  const active = learning
    .filter((i) => i.status === 'active' && i.priority !== 'high')
    .sort(compareTasks)

  const notStarted = learning
    .filter((i) => i.status === 'inbox' && i.priority !== 'high')
    .sort(compareTasks)

  const completed = learning
    .filter((i) => i.status === 'done')
    .sort((a, b) => (b.doneAt ?? b.updatedAt).localeCompare(a.doneAt ?? a.updatedAt))

  return { highPriority, active, notStarted, completed }
}
