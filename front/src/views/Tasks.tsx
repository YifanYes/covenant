import TaskList, { TaskListSkeleton } from '@/components/Task'
import type { TaskRow } from '@/types/tasks.types'
import { trpc } from '@/utils/trpc'
import { useQuery } from '@tanstack/react-query'
import { map } from 'es-toolkit/compat'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

const TasksView = () => {
  const { t } = useTranslation()

  const { data, isLoading } = useQuery(trpc.tasks.getAll.queryOptions())

  const [rows, setRows] = useState<TaskRow[]>([])

  useEffect(() => {
    !isLoading && data && setRows(map(data.tasks, (items, key) => ({ id: key, name: key, items })))
  }, [data, isLoading])

  return (
    <div className='min-h-screen w-full p-6'>
      <h1 className='text-2xl font-semibold'>{t('tasks.title')}</h1>
      <div className='flex flex-col gap-4'>
        {isLoading ? <TaskListSkeleton /> : rows.map((col) => <TaskList key={col.id} row={col} group='board' />)}
      </div>
    </div>
  )
}

export default TasksView
