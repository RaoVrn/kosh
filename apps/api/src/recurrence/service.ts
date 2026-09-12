import type { Db } from '../db.js'
import type { Item } from '@kosh/shared'
import { uid } from '@kosh/shared'
import { getItem, insertItem } from '../items/repo.js'
import { nextOccurrenceDue } from './calculation.js'
import { ValidationError } from '../items/validation.js'

export interface CompletionResult {
  completed: Item
  nextOccurrence: Item | null
}

function isRecurring(item: Item): boolean {
  return (
    item.recurrence !== null &&
    item.recurrence !== undefined &&
    item.recurrence.frequency !== 'none'
  )
}

/**
 * Marks a task done and, if it is recurring, atomically creates exactly one
 * next occurrence. Idempotent: completing an already-done (or archived) task
 * never creates another occurrence.
 */
export function completeTask(db: Db, item: Item): CompletionResult {
  db.exec('BEGIN IMMEDIATE')
  try {
    const current = getItem(db, item.id)
    if (!current) {
      db.exec('ROLLBACK')
      return { completed: item, nextOccurrence: null }
    }
    if (current.status === 'done' || current.status === 'archived') {
      db.exec('ROLLBACK')
      return { completed: current, nextOccurrence: null }
    }

    const now = new Date().toISOString()
    db.prepare(`UPDATE items SET status = 'done', done_at = ?, updated_at = ? WHERE id = ?`).run(
      now,
      now,
      item.id,
    )

    let nextOccurrence: Item | null = null
    if (isRecurring(current)) {
      if (!current.dueAt) {
        throw new ValidationError('A recurring task requires a due date')
      }
      const recurrence = current.recurrence
      if (!recurrence) {
        throw new ValidationError('A recurring task requires recurrence configuration')
      }

      const nextDue = nextOccurrenceDue(current.dueAt, recurrence)

      let nextReminder: string | null = null
      if (current.reminderAt) {
        const offsetMs = new Date(current.dueAt).getTime() - new Date(current.reminderAt).getTime()
        if (offsetMs > 0) {
          nextReminder = new Date(new Date(nextDue).getTime() - offsetMs).toISOString()
        }
      }

      const next: Item = {
        id: uid(),
        type: 'task',
        status: 'active',
        title: current.title,
        body: current.body,
        url: current.url,
        dueAt: nextDue,
        reminderAt: nextReminder,
        remindedAt: null,
        priority: current.priority,
        tags: current.tags,
        recurrence,
        recurrenceId: current.recurrenceId ?? uid(),
        createdAt: now,
        updatedAt: now,
        doneAt: null,
      }
      insertItem(db, next)
      nextOccurrence = next
    }

    db.exec('COMMIT')
    const completed = getItem(db, item.id) ?? current
    return { completed, nextOccurrence }
  } catch (err) {
    db.exec('ROLLBACK')
    throw err
  }
}
