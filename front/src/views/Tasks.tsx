import { CreateTaskDialog } from '@/components/dialogs/CreateTaskDialog'
import { UpdateTaskDialog } from '@/components/dialogs/UpdateTaskDialog'
import TaskCalendar from '@/components/tasks/TaskCalendar'
import TaskList from '@/components/tasks/TaskList'
import TasksTable from '@/components/tasks/TaskTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useCalendarStore } from '@/hooks/use-calendar-store'
import { useDebouncedMutation } from '@/hooks/use-debounced-mutation'
import { useSnackbar } from '@/hooks/use-snackbar'
import { useTasksStore } from '@/hooks/use-tasks-store'
import { useUserPreferencesStore } from '@/hooks/use-user-preferences-store'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { isUndefined, keys, map } from 'es-toolkit/compat'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'

const Tasks = () => {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(trpc.tasks.getAll.queryOptions())
  const { show } = useSnackbar()
  const { tasks, setTasks } = useTasksStore()
  const { monthIndex } = useCalendarStore()
  const { defaultTasksView } = useUserPreferencesStore()

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
    1000
  )

  useEffect(() => {
    !isUndefined(data?.tasks) && setTasks(data?.tasks)
  }, [data, setTasks])

  return (
    <div className='min-h-screen w-full p-6'>
      <Tabs defaultValue={defaultTasksView} className='w-full'>
        <div className='mb-6 flex flex-row items-center justify-between gap-4'>
          <h1 className='text-2xl font-semibold'>{t('tasks.title')}</h1>
          <div className='flex items-center gap-4'>
            <TabsList>
              <TabsTrigger value='list'>{t('tasks.tabs.list')}</TabsTrigger>
              <TabsTrigger value='calendar'>{t('tasks.tabs.calendar')}</TabsTrigger>
              <TabsTrigger value='table'>{t('tasks.tabs.table')}</TabsTrigger>
            </TabsList>
            <CreateTaskDialog />
          </div>
        </div>

        <TabsContent value='list' className='mt-4'>
          <div className='flex flex-col gap-4'>
            {map(keys(tasks), (id) => (
              <TaskList key={id} id={id} group='tasks' mutation={reorderMutation} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value='calendar' className='mt-4'>
          <TaskCalendar />
        </TabsContent>

        <TabsContent value='table' className='mt-4'>
          <TasksTable />
        </TabsContent>
      </Tabs>

      <UpdateTaskDialog />
    </div>
  )
}

export default Tasks
