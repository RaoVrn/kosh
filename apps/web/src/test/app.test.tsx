import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import App from '../App'

afterEach(cleanup)

describe('Kosh web app', () => {
  it('renders the inbox with capture by default', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Inbox' })).toBeTruthy()
    expect(screen.getByPlaceholderText("What's on your mind?")).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Add to inbox' })).toBeTruthy()
  })

  it('adds a captured item to the inbox immediately', () => {
    render(<App />)
    fireEvent.change(screen.getByPlaceholderText("What's on your mind?"), {
      target: { value: 'Test capture item' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Add to inbox' }))
    expect(screen.getByText('Test capture item')).toBeTruthy()
    expect(screen.getByText('Added to inbox')).toBeTruthy()
  })

  it('navigates to every section via the sidebar', () => {
    render(<App />)
    for (const title of ['Today', 'Tasks', 'Notes', 'Ideas', 'Learning', 'Search', 'Settings']) {
      fireEvent.click(screen.getByRole('button', { name: title }))
      expect(screen.getByRole('heading', { name: title, level: 1 })).toBeTruthy()
    }
  })

  it('searches across items', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    fireEvent.change(screen.getByLabelText('Search'), {
      target: { value: 'docker' },
    })
    expect(screen.getByText('Learn Docker networking')).toBeTruthy()
    expect(screen.getByText('Docker')).toBeTruthy()
  })

  it('marks a task done from the tasks screen', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }))
    const before = screen.getAllByRole('button', { name: 'Mark as not done' }).length
    const doneButton = screen.getAllByRole('button', { name: 'Mark as done' })[0]
    expect(doneButton).toBeTruthy()
    fireEvent.click(doneButton!)
    const after = screen.getAllByRole('button', { name: 'Mark as not done' }).length
    expect(after).toBe(before + 1)
  })

  it('opens an item detail dialog', () => {
    render(<App />)
    fireEvent.click(screen.getByText('Learn Docker networking'))
    expect(screen.getByRole('dialog')).toBeTruthy()
    const title = screen.getByLabelText('Item title') as HTMLTextAreaElement
    expect(title.value).toBe('Learn Docker networking')
  })
})
