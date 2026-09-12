import { useMemo, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { colors, radius, spacing } from '../theme'
import { ITEM_TYPES, useItems, useProjects } from '@kosh/shared'
import type { ItemType } from '@kosh/shared'
import { useNav } from '../state/NavContext'
import { Content } from '../components/Content'
import { PageHeader } from '../components/PageHeader'
import { ItemCard } from '../components/ItemCard'
import { TaskItem } from '../components/TaskItem'
import { EmptyState } from '../components/EmptyState'

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
        <View style={styles.headerRow}>
          <Pressable
            onPress={closeProject}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Back to projects"
            style={styles.backButton}
          >
            <Text style={styles.backText}>←</Text>
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.projectName}>
              {project.name}
              {project.archivedAt ? '  (archived)' : ''}
            </Text>
            {project.description ? (
              <Text style={styles.projectDescription}>{project.description}</Text>
            ) : null}
          </View>
        </View>

        <View style={styles.actionsRow}>
          {project.archivedAt ? (
            <Pressable
              onPress={() => void updateProject(project.id, { archivedAt: null })}
              accessibilityRole="button"
              accessibilityLabel="Restore project"
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>Restore project</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() =>
                void updateProject(project.id, { archivedAt: new Date().toISOString() })
              }
              accessibilityRole="button"
              accessibilityLabel="Archive project"
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>Archive project</Text>
            </Pressable>
          )}
          <Pressable
            onPress={() => void handleDelete()}
            accessibilityRole="button"
            accessibilityLabel={confirmDelete ? 'Confirm delete project' : 'Delete project'}
            style={[styles.actionButton, styles.dangerButton]}
          >
            <Text style={[styles.actionText, styles.dangerText]}>
              {confirmDelete ? 'Confirm delete' : 'Delete project'}
            </Text>
          </Pressable>
        </View>

        {confirmDelete ? (
          <Text style={[styles.meta, styles.warningText]}>
            Items inside it will not be deleted. Tap Delete project again to confirm.
          </Text>
        ) : null}

        <Text style={styles.counts}>
          {counts.total} items · {counts.task} tasks · {counts.tasksDone} completed · {counts.note}{' '}
          notes · {counts.idea} ideas · {counts.learning} learning · {counts.link} links
        </Text>

        <View style={styles.chipRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              accessibilityRole="button"
              accessibilityLabel={f === 'all' ? 'All' : f}
              accessibilityState={{ selected: filter === f }}
              style={[styles.chip, filter === f && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>
                {f === 'all' ? 'All' : f[0]!.toUpperCase() + f.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>

        {visibleItems.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Nothing here yet."
            message="Capture something and assign it to this project."
          />
        ) : (
          <FlatList
            data={visibleItems}
            keyExtractor={(i) => i.id}
            renderItem={({ item }) =>
              item.type === 'task' ? (
                <TaskItem
                  item={item}
                  onPress={() => openItem(item.id)}
                  onToggleDone={() => toggleDone(item.id)}
                />
              ) : (
                <ItemCard item={item} onPress={() => openItem(item.id)} />
              )
            }
          />
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
      {loading ? <Text style={styles.meta}>Loading…</Text> : null}
      {error ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText} numberOfLines={2}>
            {error}
          </Text>
          <Pressable
            onPress={() => void refresh()}
            accessibilityRole="button"
            accessibilityLabel="Retry loading projects"
            hitSlop={8}
          >
            <Text style={styles.errorRetry}>Retry</Text>
          </Pressable>
        </View>
      ) : null}

      {activeProjects.length === 0 && !creating ? (
        <EmptyState
          icon="folder"
          title="No projects yet."
          message="Group related items around a project or context."
        />
      ) : null}

      {creating ? (
        <View style={styles.createCard}>
          <TextInput
            style={styles.input}
            value={newName}
            onChangeText={setNewName}
            placeholder="Project name"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Project name"
          />
          <TextInput
            style={styles.input}
            value={newDescription}
            onChangeText={setNewDescription}
            placeholder="Description (optional)"
            placeholderTextColor={colors.textFaint}
            accessibilityLabel="Project description"
          />
          {formError ? <Text style={[styles.meta, styles.warningText]}>{formError}</Text> : null}
          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => void handleCreate()}
              accessibilityRole="button"
              accessibilityLabel="Create project"
              style={[styles.actionButton, styles.primaryButton]}
            >
              <Text style={styles.primaryText}>Create</Text>
            </Pressable>
            <Pressable
              onPress={() => setCreating(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel create project"
              style={styles.actionButton}
            >
              <Text style={styles.actionText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      {activeProjects.map((p) => {
        const byType: Record<ItemType, number> = {
          task: 0,
          note: 0,
          idea: 0,
          learning: 0,
          link: 0,
        }
        for (const item of items) {
          if (item.projectId === p.id) byType[item.type] += 1
        }
        const countText =
          Object.entries(byType)
            .filter(([, n]) => n > 0)
            .map(([t, n]) => `${n} ${t}`)
            .join(' · ') || 'No items yet'
        return (
          <Pressable
            key={p.id}
            onPress={() => openProject(p.id)}
            accessibilityRole="button"
            accessibilityLabel={p.name}
            style={({ pressed }) => [styles.projectCard, pressed && styles.pressed]}
          >
            <Text style={styles.projectName}>{p.name}</Text>
            {p.description ? (
              <Text style={styles.projectDescription} numberOfLines={1}>
                {p.description}
              </Text>
            ) : null}
            <Text style={styles.projectCounts}>{countText}</Text>
          </Pressable>
        )
      })}

      {!creating ? (
        <Pressable
          onPress={() => setCreating(true)}
          accessibilityRole="button"
          accessibilityLabel="New project"
          style={[styles.actionButton, styles.primaryButton, styles.newProject]}
        >
          <Text style={styles.primaryText}>New Project</Text>
        </Pressable>
      ) : null}
    </Content>
  )
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: colors.text,
    fontSize: 18,
  },
  headerText: {
    flex: 1,
  },
  projectName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  projectDescription: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 2,
  },
  projectCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceRaised,
  },
  projectCounts: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  counts: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: spacing.md,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  actionButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  primaryText: {
    color: colors.background,
    fontSize: 13,
    fontWeight: '700',
  },
  dangerButton: {
    borderColor: colors.danger,
  },
  dangerText: {
    color: colors.danger,
  },
  actionText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  meta: {
    color: colors.textFaint,
    fontSize: 12,
  },
  warningText: {
    color: colors.warning,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: colors.accent,
  },
  createCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.sm,
  },
  newProject: {
    alignSelf: 'flex-start',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
  },
  errorRetry: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 13,
  },
})
