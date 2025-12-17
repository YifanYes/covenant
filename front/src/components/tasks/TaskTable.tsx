import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useTasksStore } from '@/hooks/use-tasks-store'
import { cn } from '@/lib/utils'
import { taskPriorityTypes } from '@/types/constants.types'
import { getPriorityStyles } from '@/utils/theme.utils'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { Close } from '@nsmr/pixelart-react'
import { TaskEffort, TaskImpact, TaskStatus } from '@shared/schemas/tasks.schemas'
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
  const [effortImpactFilter, setEffortImpactFilter] = useState<string>('all')
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

      // Effort/Impact filter
      let matchesEffortImpact = true
      if (effortImpactFilter !== 'all') {
        const [impact, effort] = effortImpactFilter.split('|')
        matchesEffortImpact = task.impact === impact && task.effort === effort
      }

      // Date filter
      let matchesDate = true
      if (dateFilter && task.dueDate) {
        const taskDate = dayjs(task.dueDate).startOf('day')
        const filterDate = dayjs(dateFilter).startOf('day')
        matchesDate = taskDate.isSame(filterDate, 'day')
      } else if (dateFilter && !task.dueDate) {
        matchesDate = false
      }

      return matchesSearch && matchesStatus && matchesEffortImpact && matchesDate
    })
  }, [allTasks, searchQuery, statusFilter, effortImpactFilter, dateFilter])

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
    setEffortImpactFilter('all')
    setDateFilter(null)
  }

  const hasActiveFilters =
    searchQuery !== '' || statusFilter !== 'all' || effortImpactFilter !== 'all' || dateFilter !== null

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
          <Select value={effortImpactFilter} onValueChange={setEffortImpactFilter}>
            <SelectTrigger className='w-[200px] shrink-0'>
              <SelectValue placeholder={t('tasks.filters.effort_placeholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>{t('tasks.filters.all_types')}</SelectItem>
              <SelectItem value={`${TaskImpact.HIGH}|${TaskEffort.LOW}`}>{t('tasks.task_types.quick_win')}</SelectItem>
              <SelectItem value={`${TaskImpact.HIGH}|${TaskEffort.HIGH}`}>
                {t('tasks.task_types.major_project')}
              </SelectItem>
              <SelectItem value={`${TaskImpact.LOW}|${TaskEffort.LOW}`}>{t('tasks.task_types.fill_in')}</SelectItem>
              <SelectItem value={`${TaskImpact.LOW}|${TaskEffort.HIGH}`}>
                {t('tasks.task_types.thankless_task')}
              </SelectItem>
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
      <div className='relative min-h-0 flex-1 overflow-hidden rounded-md border'>
        <div className='absolute inset-0'>
          <Table className='table-fixed'>
            <TableHeader>
              <TableRow>
                <TableHead className='w-[300px]'>{t('tasks.table.title')}</TableHead>
                <TableHead className='w-[120px]'>{t('tasks.table.type')}</TableHead>
                <TableHead className='w-[200px]'>{t('tasks.table.status')}</TableHead>
                <TableHead className='w-[150px]'>{t('tasks.table.dueDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className='text-muted-foreground text-center'>
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
                    <TableCell className='py-2 pr-4 font-medium wrap-break-word whitespace-normal'>
                      {task.title}
                    </TableCell>
                    <TableCell className='py-2'>
                      <span
                        className={cn(
                          'rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase',
                          getPriorityStyles(task.effort, task.impact)
                        )}
                      >
                        {getTaskType(task.effort, task.impact, t)}
                      </span>
                    </TableCell>
                    <TableCell
                      className='py-2'
                      onClick={(e) => e.stopPropagation() /* Prevent row click when changing status */}
                    >
                      <Select
                        value={task.status}
                        disabled={updateTaskMutation.isPending}
                        onValueChange={(value) => handleStatusChange(task.id, value)}
                      >
                        <SelectTrigger className='w-[130px]'>
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
                    <TableCell className='py-2 text-sm whitespace-nowrap'>
                      {task.dueDate ? dayjs(task.dueDate).format('L') : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  )
}
