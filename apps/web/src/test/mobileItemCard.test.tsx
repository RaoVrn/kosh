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
