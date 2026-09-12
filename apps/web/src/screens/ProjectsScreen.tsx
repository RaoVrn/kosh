import { useMemo, useState } from 'react'
import { ITEM_TYPES, useItems, useProjects } from '@kosh/shared'
import type { ItemType } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { TaskItem } from '../components/TaskItem'
import { EmptyState } from '../components/EmptyState'
import { Icon } from '../components/Icon'

const FILTERS: (ItemType | 'all')[] = ['all', ...ITEM_TYPES]

export function ProjectsScreen() {
  const { projects, loading, error, refresh, createProject, updateProject, deleteProject } =
    useProjects()
  const { items, toggleDone } = useItems()
  const { selectedProjectId, openProject, closeProject, openItem } = useNav()
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [filter, setFilter] = useState<ItemType | 'all'>('all')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const project = selectedProjectId ? projects.find((p) => p.id === selectedProjectId) : undefined

  const projectItems = useMemo(
    () => (project ? items.filter((i) => i.projectId === project.id) : []),
    [items, project],
  )

  const counts = useMemo(() => {
    const byType: Record<ItemType, number> = { task: 0, note: 0, idea: 0, learning: 0, link: 0 }
    let tasksDone = 0
    for (const item of projectItems) {
      byType[item.type] += 1
      if (item.type === 'task' && item.status === 'done') tasksDone += 1
    }
    return { ...byType, tasksDone, total: projectItems.length }
  }, [projectItems])

  const visibleItems = useMemo(
    () => (filter === 'all' ? projectItems : projectItems.filter((i) => i.type === filter)),
    [projectItems, filter],
  )

  const activeProjects = projects.filter((p) => !p.archivedAt)

  const handleCreate = async () => {
    setFormError(null)
    if (!newName.trim()) {
      setFormError('Name is required')
      return
    }
    try {
      const created = await createProject({
        name: newName.trim(),
        description: newDescription.trim() || null,
      })
      setCreating(false)
      setNewName('')
      setNewDescription('')
      openProject(created.id)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not create the project')
    }
  }

  const handleDelete = async () => {
    if (!project) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await deleteProject(project.id)
    setConfirmDelete(false)
    closeProject()
  }

  if (project) {
    return (
      <Content>
        <div className="page-header">
          <div className="page-header-title-row">
            <button
              type="button"
              className="icon-btn"
              onClick={closeProject}
              aria-label="Back to projects"
            >
              <Icon name="arrow-up" size={18} />
            </button>
            <div>
              <h1 className="page-title">
                {project.name}
                {project.archivedAt ? (
                  <span className="project-archived-badge">Archived</span>
                ) : null}
              </h1>
              {project.description ? <p className="page-subtitle">{project.description}</p> : null}
            </div>
          </div>
          <div className="project-actions">
            {project.archivedAt ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void updateProject(project.id, { archivedAt: null })}
              >
                Restore project
              </button>
            ) : (
              <button
                type="button"
                className="btn-secondary"
                onClick={() =>
                  void updateProject(project.id, { archivedAt: new Date().toISOString() })
                }
              >
                Archive project
              </button>
            )}
            {confirmDelete ? (
              <span className="delete-confirm">
                Delete this project? Items inside it will not be deleted.
                <button type="button" className="btn-danger" onClick={() => void handleDelete()}>
                  Delete project
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button type="button" className="btn-danger" onClick={() => void handleDelete()}>
                Delete project
              </button>
            )}
          </div>
        </div>

        <div className="project-counts" aria-label="Item counts">
          <span>{counts.total} items</span>
          <span>{counts.task} tasks</span>
          <span>{counts.tasksDone} completed</span>
          <span>{counts.note} notes</span>
          <span>{counts.idea} ideas</span>
          <span>{counts.learning} learning</span>
          <span>{counts.link} links</span>
        </div>

        <div className="chip-row" role="group" aria-label="Filter by type">
          {FILTERS.map((f) => (
            <button
              key={f}
              type="button"
              className={`chip${filter === f ? ' active' : ''}`}
              aria-pressed={filter === f}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : (f as ItemType)[0]!.toUpperCase() + (f as ItemType).slice(1)}
            </button>
          ))}
        </div>

        {visibleItems.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Nothing here yet."
            message="Capture something and assign it to this project."
          />
        ) : (
          visibleItems.map((item) =>
            item.type === 'task' ? (
              <TaskItem
                key={item.id}
                item={item}
                onPress={() => openItem(item.id)}
                onToggleDone={() => toggleDone(item.id)}
              />
            ) : (
              <ItemCard key={item.id} item={item} onPress={() => openItem(item.id)} />
            ),
          )
        )}
      </Content>
    )
  }

  return (
    <Content>
      <PageHeader
        title="Projects"
        subtitle="What does each thing belong to?"
        count={activeProjects.length}
      />
      {loading ? <p className="muted">Loading…</p> : null}
      {error ? (
        <div className="error-banner" role="alert">
          <span className="error-banner-text">{error}</span>
          <button type="button" className="btn-retry" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      ) : null}

      {activeProjects.length === 0 && !creating ? (
        <EmptyState
          icon="folder"
          title="No projects yet."
          message="Group related items around a project or context."
        />
      ) : null}

      {creating ? (
        <div className="project-create">
          <input
            className="modal-title-input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Project name"
            aria-label="Project name"
            autoFocus
          />
          <input
            className="modal-title-input"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            aria-label="Project description"
          />
          {formError ? <p className="modal-meta error-text">{formError}</p> : null}
          <div className="modal-actions-row">
            <button type="button" className="btn-primary" onClick={() => void handleCreate()}>
              Create
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {activeProjects.map((p) => {
        const byType: Record<ItemType, number> = { task: 0, note: 0, idea: 0, learning: 0, link: 0 }
        for (const item of items) {
          if (item.projectId === p.id) byType[item.type] += 1
        }
        return (
          <button
            key={p.id}
            type="button"
            className="card project-card"
            onClick={() => openProject(p.id)}
          >
            <div className="card-body">
              <p className="card-title">{p.name}</p>
              {p.description ? <p className="card-preview">{p.description}</p> : null}
              <p className="project-card-counts">
                {Object.entries(byType)
                  .filter(([, n]) => n > 0)
                  .map(([t, n]) => `${n} ${t}`)
                  .join(' · ') || 'No items yet'}
              </p>
            </div>
          </button>
        )
      })}

      {!creating ? (
        <button type="button" className="btn-primary btn-block" onClick={() => setCreating(true)}>
          New Project
        </button>
      ) : null}
    </Content>
  )
}
