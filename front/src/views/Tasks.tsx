import { CreateTaskDialog } from '@/components/dialogs/CreateTaskDialog'
import { UpdateTaskDialog } from '@/components/dialogs/UpdateTaskDialog'
import TaskList, { TaskListSkeleton } from '@/components/Task'
import { useCalendarStore } from '@/hooks/use-calendar-store'
import { useDebouncedMutation } from '@/hooks/use-debounced-mutation'
import { useSnackbar } from '@/hooks/use-snackbar'
import { useTasksStore } from '@/hooks/use-tasks-store'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { isUndefined, keys, map } from 'es-toolkit/compat'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const TasksView = () => {
  const { t } = useTranslation()
  const { data, isLoading, isRefetching, refetch } = useQuery(trpc.tasks.getAll.queryOptions())
  const { show } = useSnackbar()
  const { tasks, setTasks } = useTasksStore()
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
      onError: (error) => {
        console.log(error)
        show({ variant: 'destructive', title: t('tasks.error.internal.reorder') })
      }
    }),
    2000
  )

  useEffect(() => {
    if (isLoading || isRefetching || isUndefined(data)) return
    setTasks(data?.tasks)
  }, [data, isLoading, isRefetching, setTasks])

  return (
    <div className='min-h-screen w-full p-6'>
      <div className='flex flex-row justify-between gap-4'>
        <h1 className='text-2xl font-semibold'>{t('tasks.title')}</h1>
        <CreateTaskDialog callback={refetch} />
      </div>
      <div className='flex flex-col gap-4'>
        {isLoading ? (
          <TaskListSkeleton />
        ) : (
          map(keys(tasks), (id) => <TaskList key={id} id={id} group='tasks' mutation={reorderMutation} />)
        )}
      </div>
      <UpdateTaskDialog callback={refetch} />
    </div>
  )
}

export default TasksView
