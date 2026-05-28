'use client'
import DatePicker from '@/forms/date-picker.component'
import MultiSelect from '@/forms/multi-select.component'
import { useDateFormat } from '@/hooks/use-date-format'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { useTasksStore } from '@/stores/tasks.store'
import Button from '@/ui/button.component'
import Input from '@/ui/input.component'
import Select, { SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select.component'
import Table, { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/ui/table.component'
import { invalidators } from '@/utils/query-invalidation.utils'
import { getRewardText } from '@/utils/text.utils'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import EmptyState from '@/components/empty-state.component'
import TaskTypeBadge from '@/components/tasks/task-type-badge.component'
import { ChevronLeft, ChevronRight, Cancel as Close, Bulletlist, Plus } from 'pixelarticons/react'
import { TaskEffort, TaskImpact } from '@shared/schemas/tasks.schemas'
import { useMutation, useQuery, useSuspenseQuery } from '@tanstack/react-query'
import { memo, useCallback, useEffect, useMemo, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const PAGE_SIZE = 20

const EFFORT_IMPACT_FILTER_ITEMS = [
  { id: `${TaskImpact.HIGH}|${TaskEffort.LOW}`, labelKey: 'tasks.task_types.quick_win' },
  { id: `${TaskImpact.HIGH}|${TaskEffort.HIGH}`, labelKey: 'tasks.task_types.major_project' },
  { id: `${TaskImpact.LOW}|${TaskEffort.LOW}`, labelKey: 'tasks.task_types.fill_in' },
  { id: `${TaskImpact.LOW}|${TaskEffort.HIGH}`, labelKey: 'tasks.task_types.thankless_task' }
] as const

interface StatusOption {
  publicId: string
  label: string
}

interface TaskRowProps {
  task: {
    publicId: string
    title: string
    effort: string | null
    impact: string | null
    statusPublicId: string
    dueDate: string | Date | null
  }
  statusOptions: StatusOption[]
  onSelect: () => void
  onStatusChange: (taskPublicId: string, newStatusPublicId: string) => void
  isUpdating: boolean
}

const TaskRow = memo(function TaskRow({ task, statusOptions, onSelect, onStatusChange, isUpdating }: TaskRowProps) {
  const { t } = useTranslation()
  const { formatDate } = useDateFormat()

  return (
    <TableRow className="hover:bg-muted/50 cursor-pointer" onClick={() => !isUpdating && onSelect()}>
      <TableCell className="py-2 pr-4 font-medium wrap-break-word whitespace-normal">{task.title}</TableCell>
      <TableCell className="py-2">
        <TaskTypeBadge effort={task.effort} impact={task.impact} />
      </TableCell>
      <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
        <Select
          value={task.statusPublicId}
          disabled={isUpdating}
          onValueChange={(value) => onStatusChange(task.publicId, value)}
        >
          <SelectTrigger className="w-32.5">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((status) => (
              <SelectItem key={status.publicId} value={status.publicId}>
                {t(`task_status.${status.label}` as Parameters<typeof t>[0], { defaultValue: status.label })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>
      <TableCell className="py-2 text-sm whitespace-nowrap">
        {task.dueDate ? formatDate(task.dueDate) : '-'}
      </TableCell>
    </TableRow>
  )
})

export default function TaskTable({ onCreate }: { onCreate?: () => void }) {
  const { t } = useTranslation()
  const { setSelectedTask } = useTasksStore()
  const { data: statusesData } = useSuspenseQuery(trpcOptions.userTaskStatus.getAll.queryOptions())
  const statuses = statusesData.statuses

  const defaultStatusFilter = useMemo(
    () => statuses.filter((s) => s.label !== 'DONE').map((s) => s.publicId),
    [statuses]
  )

  const form = useForm({
    defaultValues: {
      searchQuery: '',
      statusFilter: ['all'] as string[],
      effortImpactFilter: ['all'] as string[],
      dateFilter: null as Date | null,
      page: 1
    }
  })

  useEffect(() => {
    if (defaultStatusFilter.length > 0 && form.getValues('statusFilter').includes('all')) {
      form.setValue('statusFilter', defaultStatusFilter)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultStatusFilter.length])

  const {
    searchQuery = '',
    statusFilter = ['all'],
    effortImpactFilter = ['all'],
    dateFilter = null,
    page = 1
  } = useWatch({
    control: form.control
  })

  const debouncedSearch = useDebouncedValue(searchQuery, 300)

  const prevFiltersRef = useRef({
    statusFilter: JSON.stringify(statusFilter),
    effortImpactFilter: JSON.stringify(effortImpactFilter),
    dateFilter: dateFilter?.toISOString() ?? null,
    debouncedSearch
  })

  useEffect(() => {
    const currentFilters = {
      statusFilter: JSON.stringify(statusFilter),
      effortImpactFilter: JSON.stringify(effortImpactFilter),
      dateFilter: dateFilter?.toISOString() ?? null,
      debouncedSearch
    }

    const filtersChanged =
      prevFiltersRef.current.statusFilter !== currentFilters.statusFilter ||
      prevFiltersRef.current.effortImpactFilter !== currentFilters.effortImpactFilter ||
      prevFiltersRef.current.dateFilter !== currentFilters.dateFilter ||
      prevFiltersRef.current.debouncedSearch !== currentFilters.debouncedSearch

    if (filtersChanged) {
      prevFiltersRef.current = currentFilters
      if (page !== 1) {
        form.setValue('page', 1)
      }
    }
  }, [statusFilter, effortImpactFilter, dateFilter, debouncedSearch, page, form])

  const queryParams = useMemo(
    () => ({
      search: debouncedSearch || undefined,
      statusPublicIds: statusFilter.includes('all') ? undefined : statusFilter,
      effortImpact: effortImpactFilter.includes('all') ? undefined : effortImpactFilter,
      dueDate: dateFilter ? dateFilter.toISOString() : undefined,
      page,
      pageSize: PAGE_SIZE
    }),
    [debouncedSearch, statusFilter, effortImpactFilter, dateFilter, page]
  )

  const { data, isLoading } = useQuery(trpcOptions.tasks.getFiltered.queryOptions(queryParams))

  const updateTaskMutation = useMutation(
    trpcOptions.tasks.update.mutationOptions({
      onSuccess: async (data) => {
        await queryClient.invalidateQueries({ queryKey: trpcOptions.tasks.getFiltered.queryKey(queryParams) })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.tasks.getAll.queryKey() })
        await invalidators.character()
        toast.success(t('tasks.success.update', { manaReward: getRewardText(data.manaEarned, data.reserveGained, t('combat.mana_reserve')) }))
      },
      onError: (error) => toast.error(t('tasks.error.internal.update'), { description: error.message })
    })
  )

  const tasks = useMemo(() => data?.tasks ?? [], [data?.tasks])
  const totalPages = data?.totalPages ?? 1
  const totalCount = data?.totalCount ?? 0

  const handleStatusChange = useCallback(
    (taskPublicId: string, newStatusPublicId: string) => {
      const task = tasks.find((t) => t.publicId === taskPublicId)
      if (!task) return
      updateTaskMutation.mutate({
        publicId: taskPublicId,
        title: task.title,
        statusPublicId: newStatusPublicId
      })
    },
    [tasks, updateTaskMutation]
  )

  const clearFilters = useCallback(() => {
    form.reset({
      searchQuery: '',
      statusFilter: ['all'],
      effortImpactFilter: ['all'],
      dateFilter: null,
      page: 1
    })
  }, [form])

  const hasActiveFilters =
    searchQuery !== '' || !statusFilter.includes('all') || !effortImpactFilter.includes('all') || dateFilter !== null

  const statusFilterItems = useMemo(
    () => [
      { id: 'all', label: t('tasks.filters.all_statuses') },
      ...statuses.map((status) => ({
        id: status.publicId,
        label: t(`task_status.${status.label}` as Parameters<typeof t>[0], { defaultValue: status.label })
      }))
    ],
    [t, statuses]
  )

  const statusOptions = useMemo(
    () =>
      statuses.map((status) => ({
        publicId: status.publicId,
        label: status.label
      })),
    [statuses]
  )

  const effortImpactFilterItems = useMemo(
    () => [
      { id: 'all', label: t('tasks.filters.all_types') },
      ...EFFORT_IMPACT_FILTER_ITEMS.map((item) => ({
        id: item.id,
        label: t(item.labelKey)
      }))
    ],
    [t]
  )

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex items-center gap-4">
          <Input
            placeholder={t('tasks.filters.search_placeholder')}
            {...form.register('searchQuery')}
            className="w-75 flex-none"
          />
          <div className="w-50 shrink-0">
            <MultiSelect
              control={form.control}
              name="statusFilter"
              placeholder={t('tasks.filters.status_placeholder')}
              exclusiveValue="all"
              items={statusFilterItems}
            />
          </div>
          <div className="w-50 shrink-0">
            <MultiSelect
              control={form.control}
              name="effortImpactFilter"
              placeholder={t('tasks.filters.effort_placeholder')}
              exclusiveValue="all"
              items={effortImpactFilterItems}
            />
          </div>
          <DatePicker
            value={dateFilter}
            onChange={(date) => form.setValue('dateFilter', date)}
            placeholder={t('tasks.filters.date_placeholder')}
            className="w-52.5"
          />
          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <Close className="mr-2 h-4 w-4" />
              {t('tasks.filters.clear')}
            </Button>
          )}
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-md border">
        <div className="absolute inset-0">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-75">{t('tasks.table.title')}</TableHead>
                <TableHead className="w-30">{t('tasks.table.type')}</TableHead>
                <TableHead className="w-50">{t('tasks.table.status')}</TableHead>
                <TableHead className="w-37.5">{t('tasks.table.dueDate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-75">
                    <div className="flex h-full items-center justify-center">
                      <p className="text-muted-foreground text-sm italic">{t('common.loading')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : tasks.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-75">
                    {!hasActiveFilters && totalCount === 0 ? (
                      <EmptyState
                        size="default"
                        icon={<Bulletlist className="h-8 w-8" />}
                        title={t('tasks.empty_state.table.title')}
                        description={t('tasks.empty_state.table.description')}
                        action={
                          onCreate && (
                            <Button onClick={onCreate}>
                              <Plus className="mr-2 h-4 w-4" />
                              <span>{t('tasks.empty_state.action')}</span>
                            </Button>
                          )
                        }
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        <p className="text-muted-foreground text-sm italic">{t('tasks.table.no_matching_tasks')}</p>
                        <Button variant="outline" size="sm" onClick={clearFilters}>
                          {t('tasks.filters.clear')}
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ) : (
                tasks.map((task) => (
                  <TaskRow
                    key={task.publicId}
                    task={task}
                    statusOptions={statusOptions}
                    onSelect={() => setSelectedTask(task)}
                    onStatusChange={handleStatusChange}
                    isUpdating={updateTaskMutation.isPending}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-muted-foreground text-sm">
            {t('tasks.table.pagination_info', {
              start: (page - 1) * PAGE_SIZE + 1,
              end: Math.min(page * PAGE_SIZE, totalCount),
              total: totalCount
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => form.setValue('page', page - 1)} disabled={page <= 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">{t('tasks.table.page_info', { page, totalPages })}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => form.setValue('page', page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
