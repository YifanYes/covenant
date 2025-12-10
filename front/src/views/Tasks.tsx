import { CreateTaskDialog } from '@/components/dialogs/CreateTaskDialog'
import { UpdateTaskDialog } from '@/components/dialogs/UpdateTaskDialog'
import TaskCalendar from '@/components/tasks/TaskCalendar'
import TaskMatrix from '@/components/tasks/TaskMatrix'
import TasksListBoard from '@/components/tasks/TasksListBoard'
import TasksTable from '@/components/tasks/TaskTable'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useUserPreferencesStore } from '@/hooks/use-user-preferences-store'
import { useTranslation } from 'react-i18next'

const Tasks = () => {
  const { t } = useTranslation()
  const { defaultTasksView } = useUserPreferencesStore()

  return (
    <div className='min-h-full w-full p-2'>
      <Tabs defaultValue={defaultTasksView} className='h-full w-full'>
        <div className='flex flex-row items-center justify-between gap-4'>
          <h1 className='text-2xl font-semibold'>{t('tasks.title')}</h1>
          <div className='flex items-center gap-4'>
            <TabsList>
              <TabsTrigger value='list'>{t('tasks.tabs.list')}</TabsTrigger>
              <TabsTrigger value='calendar'>{t('tasks.tabs.calendar')}</TabsTrigger>
              <TabsTrigger value='table'>{t('tasks.tabs.table')}</TabsTrigger>
              <TabsTrigger value='matrix'>{t('tasks.tabs.matrix')}</TabsTrigger>
            </TabsList>
            <CreateTaskDialog />
          </div>
        </div>

        <TabsContent value='list' className='mt-4'>
          <TasksListBoard />
        </TabsContent>

        <TabsContent value='calendar' className='mt-4'>
          <TaskCalendar />
        </TabsContent>

        <TabsContent value='table' className='mt-4'>
          <TasksTable />
        </TabsContent>

        <TabsContent value='matrix' className='mt-4'>
          <TaskMatrix />
        </TabsContent>
      </Tabs>

      <UpdateTaskDialog />
    </div>
  )
}

export default Tasks
