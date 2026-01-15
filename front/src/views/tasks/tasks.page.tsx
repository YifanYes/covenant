import { useUserPreferencesStore } from '@/stores'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui'
import {
  CreateTaskDialog,
  TaskCalendar,
  TaskMatrix,
  TaskTable,
  TasksListBoard,
  UpdateTaskDialog
} from '@/views/tasks/components'
import { useTranslation } from 'react-i18next'

export default function Tasks() {
  const { t } = useTranslation()
  const { defaultTasksView } = useUserPreferencesStore()

  return (
    <div className='h-full w-full p-2'>
      <Tabs defaultValue={defaultTasksView} className='flex h-full w-full flex-col'>
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

        <TabsContent value='list' className='mt-1'>
          <TasksListBoard />
        </TabsContent>

        <TabsContent value='calendar' className='mt-2 flex h-full flex-1 flex-col overflow-hidden'>
          <TaskCalendar />
        </TabsContent>

        <TabsContent value='table' className='mt-4 flex flex-1 flex-col overflow-hidden'>
          <TaskTable />
        </TabsContent>

        <TabsContent value='matrix' className='mt-4 flex-1 overflow-hidden'>
          <TaskMatrix />
        </TabsContent>
      </Tabs>

      <UpdateTaskDialog />
    </div>
  )
}
