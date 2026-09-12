import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Project, ProjectInput, ProjectUpdate } from '../index'
import { createItemsApi, DEFAULT_API_BASE_URL, errorMessage } from '../api/itemsApi'
import type { ItemsApiClient } from '../api/itemsApi'

export interface ProjectsContextValue {
  projects: Project[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  createProject: (input: ProjectInput) => Promise<Project>
  updateProject: (id: string, patch: ProjectUpdate) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  unarchiveProject: (id: string) => Promise<void>
  deleteProject: (id: string) => Promise<void>
}

const ProjectsContext = createContext<ProjectsContextValue | null>(null)

interface ProjectsProviderProps {
  baseUrl?: string
  api?: ItemsApiClient
  children: ReactNode
}

export function ProjectsProvider({ children, baseUrl, api }: ProjectsProviderProps) {
  const client = useMemo(
    () => api ?? createItemsApi(baseUrl ?? DEFAULT_API_BASE_URL),
    [api, baseUrl],
  )
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setError(null)
      const list = await client.listProjects()
      setProjects(list)
    } catch (err) {
      setError(errorMessage(err, 'Could not load projects'))
    } finally {
      setLoading(false)
    }
  }, [client])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const createProject = useCallback(
    async (input: ProjectInput) => {
      setError(null)
      try {
        const project = await client.createProject(input)
        setProjects((prev) => [...prev, project])
        return project
      } catch (err) {
        setError(errorMessage(err, 'Could not create the project'))
        throw err
      }
    },
    [api],
  )

  const updateProject = useCallback(
    async (id: string, patch: ProjectUpdate) => {
      setError(null)
      try {
        const project = await client.updateProject(id, patch)
        setProjects((prev) => prev.map((p) => (p.id === id ? project : p)))
      } catch (err) {
        setError(errorMessage(err, 'Could not update the project'))
      }
    },
    [api],
  )

  const archiveProject = useCallback(
    (id: string) => updateProject(id, { archivedAt: new Date().toISOString() }),
    [updateProject],
  )

  const unarchiveProject = useCallback(
    (id: string) => updateProject(id, { archivedAt: null }),
    [updateProject],
  )

  const deleteProject = useCallback(
    async (id: string) => {
      setError(null)
      try {
        await client.deleteProject(id)
        setProjects((prev) => prev.filter((p) => p.id !== id))
      } catch (err) {
        setError(errorMessage(err, 'Could not delete the project'))
      }
    },
    [api],
  )

  const value = useMemo(
    () => ({
      projects,
      loading,
      error,
      refresh,
      createProject,
      updateProject,
      archiveProject,
      unarchiveProject,
      deleteProject,
    }),
    [
      projects,
      loading,
      error,
      refresh,
      createProject,
      updateProject,
      archiveProject,
      unarchiveProject,
      deleteProject,
    ],
  )

  return <ProjectsContext.Provider value={value}>{children}</ProjectsContext.Provider>
}

export function useProjects(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext)
  if (!ctx) throw new Error('useProjects must be used within a ProjectsProvider')
  return ctx
}

export function useProjectName(projectId: string | null | undefined): string | null {
  const { projects } = useProjects()
  if (!projectId) return null
  return projects.find((p) => p.id === projectId)?.name ?? null
}
