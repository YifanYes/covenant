'use client'
import { useReorderTasksMutation } from '@/hooks/use-reorder-tasks-mutation'
import { useTasksStore } from '@/stores/tasks.store'
import { trpcOptions } from '@/utils/trpc.utils'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import { useSuspenseQuery } from '@tanstack/react-query'
import { isUndefined } from 'es-toolkit/compat'
import { useEffect } from 'react'
import TaskList from './task-list.component'

export default function TaskKanban() {
  const { data } = useSuspenseQuery(trpcOptions.tasks.getAll.queryOptions())
  const { setTasks } = useTasksStore()
  const reorderMutation = useReorderTasksMutation()

  useEffect(() => {
    if (!isUndefined(data?.tasks)) {
      setTasks(data?.tasks)
    }
  }, [data, setTasks])

  return (
    <div className="grid h-full min-h-0 grid-cols-1 gap-4 md:grid-cols-3">
      {[TaskStatus.TODO, TaskStatus.DOING, TaskStatus.DONE].map((status) => (
        <TaskList key={status} id={status} group="tasks" mutation={reorderMutation} variant="kanban" />
      ))}
    </div>
  )
}
