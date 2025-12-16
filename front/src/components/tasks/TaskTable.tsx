import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTasksStore } from '@/hooks/use-tasks-store'
import { taskPriorityTypes } from '@/types/constants.types'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { Close } from '@nsmr/pixelart-react'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import DatePicker from '../forms/DatePicker'
import { Button } from '../ui/button'

// Determine task type based on effort and impact
const getTaskType = (
  effort: string | null | undefined,
  impact: string | null | undefined,
  t: (key: string) => string
): string => {
  if (!effort || !impact) return '-'
  const key = taskPriorityTypes[impact]?.[effort]
  return key ? t(key) : '-'
}

export default function TasksTable() {
  const { t } = useTranslation()
  const { data } = useSuspenseQuery(trpc.tasks.getAll.queryOptions())
  const { setSelectedTask } = useTasksStore()

  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [dateFilter, setDateFilter] = useState<Date | null>(null)

  const updateTaskMutation = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.tasks.getAll.queryKey() })
        toast.success(t('tasks.success.update'))
      },
      onError: (error) => toast.error(t('tasks.error.internal.update'), { description: error.message })
    })
  )

  // Get all tasks in a flat array for table view - using native methods
  const allTasks = useMemo(() => {
    return Object.values(data?.tasks ?? {}).flat()
  }, [data?.tasks])

  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      // Search filter
      const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase())

      // Status filter
      const matchesStatus = statusFilter === 'all' || task.status === statusFilter

      // Date filter
      let matchesDate = true
      if (dateFilter && task.dueDate) {
        const taskDate = dayjs(task.dueDate).startOf('day')
        const filterDate = dayjs(dateFilter).startOf('day')
        matchesDate = taskDate.isSame(filterDate, 'day')
      } else if (dateFilter && !task.dueDate) {
        matchesDate = false
      }

      return matchesSearch && matchesStatus && matchesDate
    })
  }, [allTasks, searchQuery, statusFilter, dateFilter])

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateTaskMutation.mutate({
      id: taskId,
      title: allTasks.find((t) => t.id === taskId)?.title || '',
      status: newStatus
    })
  }

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setDateFilter(null)
  }

  const hasActiveFilters = searchQuery !== '' || statusFilter !== 'all' || dateFilter !== null

  return (
    <div className='flex h-full flex-col'>
      <div className='mb-4 flex flex-col gap-4'>
        <div className='flex items-center gap-4'>
          <Input
            placeholder={t('tasks.filters.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-[300px] flex-none'
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-[200px] shrink-0'>
              <SelectValue placeholder={t('tasks.filters.status_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('tasks.filters.all_statuses')}</SelectItem>
              {Object.values(TaskStatus).map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`task_status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DatePicker
            value={dateFilter}
            onChange={setDateFilter}
            placeholder={t('tasks.filters.date_placeholder')}
            className='w-[210px]'
          />
          {hasActiveFilters && (
            <Button variant='outline' size='sm' onClick={clearFilters}>
              <Close className='mr-2 h-4 w-4' />
              {t('tasks.filters.clear')}
            </Button>
          )}
        </div>
      </div>
      <div className='flex-1 overflow-auto rounded-md border'>
        <Table className='table-fixed'>
          <TableHeader>
            <TableRow>
              <TableHead className='w-[25%]'>{t('tasks.table.title')}</TableHead>
              <TableHead className='w-[15%]'>{t('tasks.table.status')}</TableHead>
              <TableHead className='w-[15%]'>{t('tasks.table.type')}</TableHead>
              <TableHead className='w-[15%]'>{t('tasks.table.dueDate')}</TableHead>
              <TableHead className='w-[30%]'>{t('tasks.table.objectives')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTasks.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className='text-muted-foreground text-center'>
                  {t('tasks.table.no_tasks')}
                </TableCell>
              </TableRow>
            ) : (
              filteredTasks.map((task) => (
                <TableRow
                  key={task.id}
                  className='hover:bg-muted/50 cursor-pointer'
                  onClick={() => !updateTaskMutation.isPending && setSelectedTask(task)}
                >
                  <TableCell className='font-medium break-words whitespace-normal'>{task.title}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation() /* Prevent row click when changing status */}>
                    <Select
                      value={task.status}
                      disabled={updateTaskMutation.isPending}
                      onValueChange={(value) => handleStatusChange(task.id, value)}
                    >
                      <SelectTrigger className='w-[150px]'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(TaskStatus).map((status) => (
                          <SelectItem key={status} value={status}>
                            {t(`task_status.${status}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <span className='text-muted-foreground text-sm'>{getTaskType(task.effort, task.impact, t)}</span>
                  </TableCell>
                  <TableCell>{task.dueDate ? dayjs(task.dueDate).format('DD-MM-YYYY') : '-'}</TableCell>
                  <TableCell className='break-words whitespace-normal'>
                    {task.objectives && task.objectives.length > 0
                      ? task.objectives.map((obj) => obj.name).join(', ')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
