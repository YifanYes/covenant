import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTasksStore } from '@/hooks/use-tasks-store'
import type { Task } from '@/types/models.types'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { flatten, values as getValues, filter as lodashFilter, map } from 'es-toolkit/compat'
import { X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import DatePicker from '../forms/DatePicker'
import { Button } from '../ui/button'

export default function TasksTable() {
  const { t } = useTranslation()
  const { tasks } = useTasksStore()
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

  // Get all tasks in a flat array for table view
  const allTasks = useMemo(() => {
    return flatten(getValues(tasks))
  }, [tasks])

  const filteredTasks = useMemo(() => {
    return lodashFilter(allTasks, (task: Task) => {
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
    <div>
      <div className='mb-4 flex flex-col gap-4'>
        <div className='flex items-center gap-4'>
          <Input
            placeholder={t('tasks.filters.search_placeholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className='w-[300px]'
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className='w-[200px]'>
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
              <X className='mr-2 h-4 w-4' />
              {t('tasks.filters.clear')}
            </Button>
          )}
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className='w-[30%]'>{t('tasks.table.title')}</TableHead>
            <TableHead className='w-[20%]'>{t('tasks.table.status')}</TableHead>
            <TableHead className='w-[15%]'>{t('tasks.table.dueDate')}</TableHead>
            <TableHead className='w-[35%]'>{t('tasks.table.objectives')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredTasks.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className='text-muted-foreground text-center'>
                {t('tasks.table.no_tasks')}
              </TableCell>
            </TableRow>
          ) : (
            map(filteredTasks, (task: Task) => (
              <TableRow key={task.id}>
                <TableCell className='font-medium'>{task.title}</TableCell>
                <TableCell>
                  <Select value={task.status} onValueChange={(value) => handleStatusChange(task.id, value)}>
                    <SelectTrigger className='w-[150px]'>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TaskStatus).map((status) => (
                        <SelectItem value={status}>{t(`task_status.${status}`)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{task.dueDate ? dayjs(task.dueDate).format('DD-MM-YYYY') : '-'}</TableCell>
                <TableCell>
                  {task.objectives && task.objectives.length > 0
                    ? map(task.objectives, (obj) => obj.name).join(', ')
                    : '-'}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  )
}
