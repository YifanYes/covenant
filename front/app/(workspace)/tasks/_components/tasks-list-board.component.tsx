'use client'
import { useDebouncedMutation } from '@/hooks/use-debounced-mutation'
import { useCalendarStore } from '@/stores/calendar.store'
import { useTasksStore } from '@/stores/tasks.store'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import { useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { isUndefined } from 'es-toolkit/compat'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import TaskList from './task-list.component'

export default function TasksListBoard() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(trpc.tasks.getAll.queryOptions())
  const { setTasks } = useTasksStore()
  const { monthIndex } = useCalendarStore()

  const reorderMutation = useDebouncedMutation(
    trpc.tasks.bulkUpdate.mutationOptions({
      onSuccess: async () =>
        queryClient.invalidateQueries({
          queryKey: trpc.tasks.getByDate.queryKey({
            monthIndex: monthIndex.toString(),
            year: dayjs().year().toString()
          })
        }),
      onError: (error) => toast.error(t('tasks.error.internal.reorder'), { description: error.message })
    }),
    1400
  )

  useEffect(() => {
    !isUndefined(data?.tasks) && setTasks(data?.tasks)
  }, [data, setTasks])

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-col gap-4'>
        {[TaskStatus.DOING, TaskStatus.TODO].map((status) => (
          <TaskList key={status} id={status} group='tasks' mutation={reorderMutation} />
        ))}
      </div>
    </div>
  )
}
