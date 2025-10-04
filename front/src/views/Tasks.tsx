import { CreateTaskDialog } from '@/components/dialogs/CreateTaskDialog'
import { UpdateTaskDialog } from '@/components/dialogs/UpdateTaskDialog'
import TaskList, { TaskListSkeleton, type TaskRow } from '@/components/Task'
import type { Task } from '@/types/models.types'
import { trpc } from '@/utils/trpc.utils'
import { useQuery } from '@tanstack/react-query'
import { map } from 'es-toolkit/compat'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const TasksView = () => {
  const { t } = useTranslation()
  const { data, isLoading, isRefetching, refetch } = useQuery(trpc.tasks.getAll.queryOptions())
  const [rows, setRows] = useState<TaskRow[]>([])
  const [selectedTask, setSelectedTask] = useState<Task>()

  useEffect(() => {
    !isLoading && !isRefetching && data && setRows(map(data.tasks, (items, key) => ({ id: key, name: key, items })))
  }, [data, isLoading, isRefetching])

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
          rows.map((col) => (
            <TaskList key={col.id} row={col} collection={data?.tasks} setSelectedTask={setSelectedTask} group='board' />
          ))
        )}
      </div>
      <UpdateTaskDialog task={selectedTask} setTask={setSelectedTask} callback={refetch} />
    </div>
  )
}

export default TasksView
