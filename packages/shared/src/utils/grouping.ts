import type { Item } from '../index'
import { isDueToday, isOverdue } from './time'

export interface TodayGroup {
  key: 'overdue' | 'important' | 'today' | 'upcoming'
  title: string
  items: Item[]
}

function byDueAt(a: Item, b: Item): number {
  if (!a.dueAt) return 1
  if (!b.dueAt) return -1
  return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime()
}

export function getTodayGroups(items: Item[], ref: Date = new Date()): TodayGroup[] {
  const pending = items.filter((i) => i.type === 'task' && i.status !== 'done')
  const seen = new Set<string>()

  const overdue = pending.filter((i) => i.dueAt && isOverdue(i.dueAt, ref)).sort(byDueAt)
  overdue.forEach((i) => seen.add(i.id))

  const important = pending.filter((i) => i.priority === 'high' && !seen.has(i.id)).sort(byDueAt)
  important.forEach((i) => seen.add(i.id))

  const today = pending
    .filter((i) => i.dueAt && isDueToday(i.dueAt, ref) && !seen.has(i.id))
    .sort(byDueAt)
  today.forEach((i) => seen.add(i.id))

  const upcoming = pending
    .filter((i) => i.dueAt && !seen.has(i.id) && !isOverdue(i.dueAt, ref))
    .sort(byDueAt)
    .slice(0, 4)

  const groups: TodayGroup[] = []
  if (overdue.length) groups.push({ key: 'overdue', title: 'Overdue', items: overdue })
  if (important.length) groups.push({ key: 'important', title: 'Important', items: important })
  if (today.length) groups.push({ key: 'today', title: 'Today', items: today })
  if (upcoming.length) groups.push({ key: 'upcoming', title: 'Upcoming', items: upcoming })
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
