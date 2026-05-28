'use client'
import EmptyState from '@/components/empty-state.component'
import { useReorderTasksMutation } from '@/hooks/use-reorder-tasks-mutation'
import { useTasksStore } from '@/stores/tasks.store'
import Button from '@/ui/button.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { isUndefined } from 'es-toolkit/compat'
import { Bulletlist, Plus } from 'pixelarticons/react'
import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import TaskList from './task-list.component'

export default function TasksListBoard({ onCreate }: { onCreate?: () => void }) {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(trpcOptions.tasks.getAll.queryOptions())
  const { data: statusesData } = useSuspenseQuery(trpcOptions.userTaskStatus.getAll.queryOptions())
  const { setTasks } = useTasksStore()
  const reorderMutation = useReorderTasksMutation()

  useEffect(() => {
    if (!isUndefined(data?.tasks)) {
      setTasks(data?.tasks)
    }
  }, [data, setTasks])

  const visibleStatuses = statusesData.statuses.filter((s) => s.label !== 'DONE')

  const totalTasks = useMemo(
    () => Object.values(data?.tasks ?? {}).reduce((sum, list) => sum + list.length, 0),
    [data?.tasks]
  )

  if (totalTasks === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          size="large"
          icon={<Bulletlist />}
          title={t('tasks.empty_state.list.title')}
          description={t('tasks.empty_state.list.description')}
          action={
            onCreate && (
              <Button onClick={onCreate}>
                <Plus className="mr-2 h-4 w-4" />
                <span>{t('tasks.empty_state.action')}</span>
              </Button>
            )
          }
        />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto">
      {visibleStatuses.map((status) => (
        <TaskList
          key={String(status.id)}
          id={String(status.id)}
          label={status.label}
          group="tasks"
          mutation={reorderMutation}
        />
      ))}
    </div>
  )
}
