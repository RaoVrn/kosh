import type { Item } from '../index'
import { isOverdue, isToday } from './time'

export interface TaskGroup {
  key: 'overdue' | 'today' | 'upcoming' | 'completed'
  title: string
  items: Item[]
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

export function isPendingTask(item: Item): boolean {
  return item.type === 'task' && item.status !== 'done'
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
