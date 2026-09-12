import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Item, Project } from '@kosh/shared'
import App from '../App'
import { createApiFetchMock } from './apiMock'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function project(overrides: Partial<Project> = {}): Project {
  return {
    id: 'proj-1',
    name: 'Kosh',
    description: 'Personal second-brain app.',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    archivedAt: null,
    ...overrides,
  }
}

function item(overrides: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    type: 'task',
    status: 'inbox',
    title: 'Fix mobile navigation',
    body: null,
    url: null,
    priority: 'high',
    tags: null,
    projectId: 'proj-1',
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('Projects (web)', () => {
  it('lists active projects and shows an empty state', async () => {
    vi.stubGlobal('fetch', createApiFetchMock([], [], {}, [project()]))
    render(<App />)
    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    const projectsBtn = screen.getAllByRole('button', { name: 'Projects' })[0]!
    fireEvent.click(projectsBtn)
    expect(await screen.findByRole('heading', { name: 'Projects', level: 1 })).toBeTruthy()
    expect(screen.getAllByText('Kosh').length).toBeGreaterThan(0)
  })

  it('creates a project and opens its detail', async () => {
    const fetchMock = createApiFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    const projectsBtn = screen.getAllByRole('button', { name: 'Projects' })[0]!
    fireEvent.click(projectsBtn)
    await screen.findByRole('heading', { name: 'Projects', level: 1 })

    fireEvent.click(screen.getByRole('button', { name: 'New Project' }))
    fireEvent.change(screen.getByLabelText('Project name'), { target: { value: 'DSA' } })
    fireEvent.change(screen.getByLabelText('Project description'), {
      target: { value: 'Data structures' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))

    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
    const posted = JSON.parse(String(postCall?.[1]?.body)) as { name: string; description: string }
    expect(posted).toEqual({ name: 'DSA', description: 'Data structures' })
    expect(await screen.findByText('Nothing here yet.')).toBeTruthy()
    expect(screen.getByText('DSA')).toBeTruthy()
  })

  it('shows a project detail with its items, counts and type filtering', async () => {
    const seed = [
      item({ id: 't1', type: 'task', title: 'Fix nav', status: 'inbox' }),
      item({ id: 'n1', type: 'note', title: 'Architecture note', status: 'inbox' }),
      item({ id: 't2', type: 'task', title: 'Other task', projectId: null }),
    ]
    vi.stubGlobal('fetch', createApiFetchMock(seed, [], {}, [project()]))
    render(<App />)
    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    const projectsBtn = screen.getAllByRole('button', { name: 'Projects' })[0]!
    fireEvent.click(projectsBtn)
    await screen.findByRole('heading', { name: 'Projects', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: /Kosh/ }))

    expect(await screen.findByText('Fix nav')).toBeTruthy()
    expect(screen.getByText('Architecture note')).toBeTruthy()
    expect(screen.queryByText('Other task')).toBeNull()
    expect(screen.getByText(/2 items/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Note' }))
    expect(screen.queryByText('Fix nav')).toBeNull()
    expect(screen.getByText('Architecture note')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'All' }))
    expect(screen.getByText('Fix nav')).toBeTruthy()
  })

  it('shows a subtle project label on item cards', async () => {
    vi.stubGlobal('fetch', createApiFetchMock([item()], [], {}, [project()]))
    render(<App />)
    await screen.findByText('Fix mobile navigation')
    expect(screen.getByText('↳ Kosh')).toBeTruthy()
  })

  it('assigns and removes a project through the detail editor', async () => {
    const fetchMock = createApiFetchMock([item({ projectId: null })], [], {}, [project()])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    await screen.findByText('Fix mobile navigation')
    fireEvent.click(screen.getByText('Fix mobile navigation'))

    const select = (await screen.findByLabelText('Project')) as HTMLSelectElement
    expect(select.value).toBe('')
    fireEvent.change(select, { target: { value: 'proj-1' } })

    await waitFor(() => {
      const patch = fetchMock.mock.calls.find(
        ([, init]) => init?.method === 'PATCH' && String(init.body).includes('projectId'),
      )
      expect(patch).toBeTruthy()
      expect(JSON.parse(String(patch?.[1]?.body)).projectId).toBe('proj-1')
    })
  })

  it('archives a project without touching items, and restores it', async () => {
    const fetchMock = createApiFetchMock([item()], [], {}, [project()])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    const projectsBtn = screen.getAllByRole('button', { name: 'Projects' })[0]!
    fireEvent.click(projectsBtn)
    await screen.findByRole('heading', { name: 'Projects', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: /Kosh/ }))

    fireEvent.click(await screen.findByRole('button', { name: 'Archive project' }))
    expect(await screen.findByText(/Archived/)).toBeTruthy()
    expect(screen.getByText('Fix mobile navigation')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Restore project' }))
    await waitFor(() => {
      expect(screen.queryByText('Archived')).toBeNull()
    })
  })

  it('deletes a project after confirmation; items remain', async () => {
    const fetchMock = createApiFetchMock([item()], [], {}, [project()])
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)
    await screen.findByRole('heading', { name: 'Inbox', level: 1 })
    const projectsBtn = screen.getAllByRole('button', { name: 'Projects' })[0]!
    fireEvent.click(projectsBtn)
    await screen.findByRole('heading', { name: 'Projects', level: 1 })
    fireEvent.click(screen.getByRole('button', { name: /Kosh/ }))

    const del = await screen.findByRole('button', { name: 'Delete project' })
    fireEvent.click(del)
    expect(screen.getByText(/Items inside it will not be deleted/)).toBeTruthy()
    const confirm = await screen.findByRole('button', { name: 'Delete project' })
    fireEvent.click(confirm)

    await waitFor(() => {
      const delCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'DELETE')
      expect(delCall?.[0]).toContain('/api/v1/projects/proj-1')
    })
    expect(await screen.findByRole('heading', { name: 'Projects', level: 1 })).toBeTruthy()
  })

  it('shows a suggested project in the smart capture preview and persists it', async () => {
    const fetchMock = createApiFetchMock(
      [],
      [],
      {
        interpretResult: {
          type: 'task',
          title: 'Fix Kosh mobile navigation',
          body: null,
          url: null,
          priority: 'high',
          dueAt: null,
          reminderAt: null,
          tags: ['mobile'],
          recurrence: null,
          projectId: 'proj-1',
          confidence: 'high',
        },
      },
      [project()],
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<App />)

    const input = await screen.findByLabelText('Capture text')
    fireEvent.change(input, { target: { value: 'Fix the Kosh mobile navigation' } })
    fireEvent.click(screen.getByRole('button', { name: 'Smart capture' }))

    expect(await screen.findByText('Kosh understood this as')).toBeTruthy()
    const select = screen.getByLabelText('Project') as HTMLSelectElement
    expect(select.value).toBe('proj-1')

    fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => {
      const post = fetchMock.mock.calls.find(
        ([url, init]) => init?.method === 'POST' && String(url).endsWith('/api/v1/items'),
      )
      const posted = JSON.parse(String(post?.[1]?.body)) as { projectId: string }
      expect(posted.projectId).toBe('proj-1')
    })
  })
})
