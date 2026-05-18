'use client'

import EmptyState from '@/components/empty-state.component'
import type { ReorderTasksMutation } from '@/hooks/use-reorder-tasks-mutation'
import { cn } from '@/lib/cn.lib'
import { useTasksStore } from '@/stores/tasks.store'
import Task from '@/tasks/task.component'
import { type Task as TaskType } from '@/types/models.types'
import { useDragAndDrop } from '@formkit/drag-and-drop/react'
import { flatten, values as getValues, map } from 'es-toolkit/compat'
import { Flag } from 'pixelarticons/react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const reIndex = (arr: TaskType[]) => arr.map((t, i) => ({ ...t, order: i }))

export default function TaskList({
  id,
  group,
  mutation,
  variant = 'list'
}: {
  id: string
  group: string
  mutation: ReorderTasksMutation
  variant?: 'list' | 'kanban'
}) {
  const { t } = useTranslation()
  const { tasks, setSelectedTask, setTasks } = useTasksStore()

  const commit = (next: Record<string, TaskType[]>) => {
    setTasks(next)
    mutation.debouncedMutate({ tasks: flatten(getValues(next)) })
  }

  const [parent, values, setValues] = useDragAndDrop<HTMLUListElement, TaskType>(tasks?.[id] ?? [], {
    group,
    onSort: ({ parent, values: newValues }) => {
      const listId = parent.el.dataset.listId
      if (!listId) return
      const allTasks = useTasksStore.getState().tasks
      commit({ ...allTasks, [listId]: reIndex(newValues as TaskType[]) })
    },
    onTransfer: ({ sourceParent, targetParent, draggedNodes }) => {
      const sourceId = sourceParent.el.dataset.listId
      const targetId = targetParent.el.dataset.listId
      if (!sourceId || !targetId) return
      if (id !== sourceId) return

      const sourceVals = sourceParent.data.getValues(sourceParent.el) as TaskType[]
      const targetVals = targetParent.data.getValues(targetParent.el) as TaskType[]
      const draggedIds = new Set(draggedNodes.map((n) => (n.data.value as TaskType).id))
      const targetWithStatus = targetVals.map((t) => (draggedIds.has(t.id) ? { ...t, status: targetId } : t))
      const allTasks = useTasksStore.getState().tasks
      commit({
        ...allTasks,
        [sourceId]: reIndex(sourceVals),
        [targetId]: reIndex(targetWithStatus)
      })
    }
  })

  useEffect(() => {
    setValues(tasks?.[id] ?? [])
  }, [tasks, id, setValues])

  const lowerId = id.toLowerCase()
  const isKanban = variant === 'kanban'

  return (
    <section className={cn('w-full', isKanban ? 'flex h-full min-h-0 flex-col py-2' : 'py-4')}>
      <header className="mb-2 flex items-center justify-between">
        <h2 className="text-md font-medium">{t(`task_status.${id}`).toUpperCase()}</h2>
      </header>
      <div
        className={cn(
          'relative isolate rounded-md border-2',
          isKanban ? 'flex min-h-0 flex-1 flex-col' : values.length === 0 ? 'min-h-52' : 'min-h-20'
        )}
      >
        {values.length === 0 && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <EmptyState
              size="compact"
              icon={<Flag className="h-5 w-5" />}
              title={t(`tasks.empty_state.${lowerId}.title` as Parameters<typeof t>[0], {
                defaultValue: t('tasks.empty_state.todo.title')
              })}
              description={t(`tasks.empty_state.${lowerId}.description` as Parameters<typeof t>[0], {
                defaultValue: t('tasks.empty_state.todo.description')
              })}
            />
          </div>
        )}
        <ul
          ref={parent}
          className={cn(
            'flex flex-col rounded-md',
            isKanban ? 'min-h-0 flex-1 gap-2 overflow-y-auto p-3' : 'h-full min-h-20 gap-1 p-3'
          )}
          data-list-id={id}
        >
          {map(values, (task: TaskType) => (
            <Task key={task.id} task={task} setSelectedTask={setSelectedTask} variant={isKanban ? 'card' : 'row'} />
          ))}
        </ul>
      </div>
    </section>
  )
}
