import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import type { Item } from '@kosh/shared'
import { ProjectsProvider } from '@kosh/shared'
import type { ItemsApiClient } from '@kosh/shared'
import { ItemCard } from '../../../mobile/src/components/ItemCard'

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}))

function renderCard(ui: ReactElement) {
  return render(ui, { wrapper })
}

function rerenderCard(ui: ReactElement, result: ReturnType<typeof render>) {
  result.rerender(ui)
}

function fakeProjectsApi(): ItemsApiClient {
  return {
    getItems: async () => [],
    searchItems: async () => ({
      items: [],
      meta: { limit: 25, offset: 0, total: 0, hasMore: false },
    }),
    getItem: async () => {
      throw new Error('unused')
    },
    createItem: async () => {
      throw new Error('unused')
    },
    updateItem: async () => {
      throw new Error('unused')
    },
    deleteItem: async () => {},
    getNotifications: async () => [],
    markNotificationRead: async () => {
      throw new Error('unused')
    },
    interpretCapture: async () => {
      throw new Error('unused')
    },
    transcribeAudio: async () => {
      throw new Error('unused')
    },
    listProjects: async () => [],
    getProject: async () => {
      throw new Error('unused')
    },
    createProject: async () => {
      throw new Error('unused')
    },
    updateProject: async () => {
      throw new Error('unused')
    },
    deleteProject: async () => {
      throw new Error('unused')
    },
    listAttachments: async () => [],
    uploadAttachment: async () => {
      throw new Error('unused')
    },
    deleteAttachment: async () => {
      throw new Error('unused')
    },
    getAttachmentUrl: () => 'http://localhost:3001/api/v1/attachments/x',
    processInboxItem: async () => ({ summary: null, suggestions: [] }),
    acceptProcessedSuggestions: async () => ({
      created: [],
      source: {} as never,
      skippedDuplicates: [],
    }),
  }
}

function wrapper({ children }: { children: ReactNode }) {
  return <ProjectsProvider api={fakeProjectsApi()}>{children}</ProjectsProvider>
}

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const TYPES = ['task', 'note', 'idea', 'learning', 'link'] as const
const STATUSES = ['inbox', 'active', 'done', 'archived'] as const

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    type: 'note',
    title: 'Render me',
    body: null,
    url: null,
    priority: null,
    dueAt: null,
    reminderAt: null,
    tags: null,
    status: 'inbox',
    createdAt: '2026-09-12T08:00:00.000Z',
    updatedAt: '2026-09-12T08:00:00.000Z',
    ...overrides,
  }
}

describe('mobile ItemCard interactive structure (Expo Web safety)', () => {
  it('renders no interactive control nested inside another interactive control', () => {
    renderCard(
      <ItemCard
        item={makeItem({ type: 'idea', status: 'inbox' })}
        onPress={() => {}}
        onProcess={() => {}}
        onArchive={() => {}}
        onConvertToTask={() => {}}
      />,
    )

    // react-native-web renders Pressable with role="button"/"checkbox".
    // There must be NO interactive element inside another interactive element.
    const nestedButtons = document.querySelectorAll('[role="button"] [role="button"]')
    const nestedCheck = document.querySelectorAll('[role="button"] [role="checkbox"]')
    const nestedInCheck = document.querySelectorAll('[role="checkbox"] [role="button"]')
    expect(nestedButtons).toHaveLength(0)
    expect(nestedCheck).toHaveLength(0)
    expect(nestedInCheck).toHaveLength(0)
  })

  it('open control and action buttons are siblings (actions outside the open Pressable)', () => {
    renderCard(
      <ItemCard
        item={makeItem({ type: 'note', status: 'inbox' })}
        onPress={() => {}}
        onProcess={() => {}}
        onArchive={() => {}}
      />,
    )

    const open = screen.getByRole('button', { name: 'Note: Render me' })
    const process = screen.getByRole('button', { name: 'Process' })
    const archive = screen.getByRole('button', { name: 'Archive' })

    // The open control must not be an ancestor of the action buttons.
    expect(open.contains(process)).toBe(false)
    expect(open.contains(archive)).toBe(false)
  })

  it('pressing an action does not trigger the open callback (siblings, no propagation)', () => {
    const onPress = vi.fn()
    const onProcess = vi.fn()
    const onArchive = vi.fn()
    renderCard(
      <ItemCard
        item={makeItem({ type: 'task', status: 'inbox' })}
        onPress={onPress}
        onProcess={onProcess}
        onArchive={onArchive}
        onToggleDone={() => {}}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Process' }))
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(onProcess).toHaveBeenCalledTimes(1)
    expect(onArchive).toHaveBeenCalledTimes(1)
    expect(onPress).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Task: Render me' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe('mobile ItemCard renders every type and status without crashing', () => {
  for (const type of TYPES) {
    for (const status of STATUSES) {
      it(`${type} + ${status}`, () => {
        const onPress = vi.fn()
        const { unmount } = renderCard(
          <ItemCard
            item={makeItem({ type, status, url: type === 'link' ? 'https://example.com' : null })}
            onPress={onPress}
          />,
        )
        expect(screen.getByText('Render me')).toBeTruthy()
        unmount()
      })
    }
  }
})

describe('mobile ItemCard inbox actions', () => {
  it('renders action buttons only when their callbacks are provided', () => {
    const all = vi.fn()
    const rendered = renderCard(
      <ItemCard
        item={makeItem()}
        onPress={() => {}}
        onProcess={all}
        onArchive={all}
        onConvertToTask={all}
        onOpenLink={all}
      />,
    )
    expect(screen.getByRole('button', { name: 'Process' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Archive' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Convert to task' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy()

    rerenderCard(<ItemCard item={makeItem()} onPress={() => {}} />, rendered)
    expect(screen.queryByRole('button', { name: 'Process' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Archive' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Convert to task' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull()
  })

  it('fires Process / Convert to task / Archive callbacks without triggering card press', () => {
    const onPress = vi.fn()
    const onProcess = vi.fn()
    const onConvert = vi.fn()
    const onArchive = vi.fn()
    renderCard(
      <ItemCard
        item={makeItem({ type: 'idea' })}
        onPress={onPress}
        onProcess={onProcess}
        onConvertToTask={onConvert}
        onArchive={onArchive}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Process' }))
    fireEvent.click(screen.getByRole('button', { name: 'Convert to task' }))
    fireEvent.click(screen.getByRole('button', { name: 'Archive' }))
    expect(onProcess).toHaveBeenCalledTimes(1)
    expect(onConvert).toHaveBeenCalledTimes(1)
    expect(onArchive).toHaveBeenCalledTimes(1)
    expect(onPress).not.toHaveBeenCalled()
  })

  it('renders Open only when its callback is provided (caller gates it to links)', () => {
    const open = vi.fn()
    const rendered = renderCard(
      <ItemCard
        item={makeItem({ type: 'link', url: 'https://example.com' })}
        onPress={() => {}}
        onOpenLink={open}
      />,
    )
    expect(screen.getByRole('button', { name: 'Open' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(open).toHaveBeenCalledTimes(1)

    rerenderCard(<ItemCard item={makeItem({ type: 'link' })} onPress={() => {}} />, rendered)
    expect(screen.queryByRole('button', { name: 'Open' })).toBeNull()
  })

  it('renders the task completion checkbox and shows Done state', () => {
    const onToggle = vi.fn()
    const rendered = renderCard(
      <ItemCard
        item={makeItem({ type: 'task', status: 'active' })}
        onPress={() => {}}
        onToggleDone={onToggle}
      />,
    )
    expect(screen.getByRole('checkbox', { name: 'Mark as done' })).toBeTruthy()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Mark as done' }))
    expect(onToggle).toHaveBeenCalledTimes(1)

    rerenderCard(
      <ItemCard
        item={makeItem({ type: 'task', status: 'done' })}
        onPress={() => {}}
        onToggleDone={onToggle}
      />,
      rendered,
    )
    expect(screen.getByRole('checkbox', { name: 'Mark as not done' })).toBeTruthy()
  })
})
