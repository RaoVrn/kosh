import { useProjects } from '@kosh/shared'
import type { Project } from '@kosh/shared'

interface ProjectSelectorProps {
  value: string | null
  onChange: (projectId: string | null) => void
  includeArchivedId?: string | null
  ariaLabel?: string
}

export function ProjectSelector({
  value,
  onChange,
  includeArchivedId,
  ariaLabel = 'Project',
}: ProjectSelectorProps) {
  const { projects } = useProjects()
  const active = projects.filter((p) => !p.archivedAt)
  const archivedVisible = projects.filter(
    (p) => p.archivedAt && (value === p.id || includeArchivedId === p.id),
  )

  const options: (Project | null)[] = [null, ...active, ...archivedVisible]

  return (
    <select
      className="project-select"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
      aria-label={ariaLabel}
    >
      {options.map((p) => (
        <option key={p?.id ?? 'none'} value={p?.id ?? ''}>
          {p ? (p.archivedAt ? `${p.name} (archived)` : p.name) : 'No project'}
        </option>
      ))}
    </select>
  )
}
