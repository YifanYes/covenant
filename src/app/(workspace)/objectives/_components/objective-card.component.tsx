'use client'
import LoaderButton from '@/common/loader-button.component'
import DatePicker from '@/forms/date-picker.component'
import MultiSelect from '@/forms/multi-select.component'
import TextInput from '@/forms/text-input.component'
import { useDateFormat } from '@/hooks/use-date-format'
import { areaBorderStyles, areaProgressBarStyles, areaSimpleStyles } from '@/types/colors.types'
import { allIcons } from '@/types/icons.types'
import type { Objective } from '@/types/models.types'
import Button from '@/ui/button.component'
import Dialog, {
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/ui/dialog.component'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { updateObjectiveSchema, type UpdateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Calendar, Check, Repeat } from 'pixelarticons/react'
import { toast } from 'sonner'
import ConfirmCompleteObjectiveDialog from './confirm-complete-objective-dialog.component'
import ConfirmDeleteObjectiveDialog from './confirm-delete-objective-dialog.component'
import ObjectiveSummaryList from './objective-summary-list.component'

export default function ObjectiveCard({ objective }: { objective: Objective }) {
  const { t } = useTranslation()
  const { formatDate } = useDateFormat()
  const [open, setOpen] = useState(false)

  const { data: areasData } = useSuspenseQuery(trpcOptions.areas.getAll.queryOptions())
  const { data: tasksData } = useSuspenseQuery(trpcOptions.tasks.getAll.queryOptions())
  const { data: habitsData } = useSuspenseQuery(trpcOptions.habits.getAll.queryOptions())
  const { data: statusesData } = useSuspenseQuery(trpcOptions.userTaskStatus.getAll.queryOptions())
  const doneStatusId = statusesData.statuses.find((s) => s.label === 'DONE')?.id ?? null
  const incompleteStatusIds = statusesData.statuses.filter((s) => s.label !== 'DONE').map((s) => s.id)

  const updateMutation = useMutation(
    trpcOptions.objectives.update.mutationOptions({
      onSuccess: () => {
        toast.success(t('objectives.update.success'))
        queryClient.invalidateQueries({ queryKey: trpcOptions.objectives.getAll.queryKey() })
        queryClient.invalidateQueries({ queryKey: trpcOptions.tasks.getAll.queryKey() })
        queryClient.invalidateQueries({ queryKey: trpcOptions.habits.getAll.queryKey() })
        setOpen(false)
      },
      onError: (error) => toast.error(t('objectives.update.error'), { description: error.message })
    })
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<UpdateObjectiveBodyType>({
    resolver: standardSchemaResolver(updateObjectiveSchema),
    mode: 'onSubmit',
    defaultValues: {
      id: objective.id,
      name: objective.name,
      description: objective.description || '',
      dueDate: objective.dueDate ? new Date(objective.dueDate) : undefined,
      areas: objective.areas?.map((area) => area.id) || [],
      tasks: objective.tasks?.map((task) => task.id) || [],
      habits: objective.habits?.map((habit) => habit.id) || []
    }
  })

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      reset({
        id: objective.id,
        name: objective.name,
        description: objective.description || '',
        dueDate: objective.dueDate ? new Date(objective.dueDate) : undefined,
        areas: objective.areas?.map((area) => area.id) || [],
        tasks: objective.tasks?.map((task) => task.id) || [],
        habits: objective.habits?.map((habit) => habit.id) || []
      })
    }
  }, [open, objective, reset])

  const onSubmit = (data: UpdateObjectiveBodyType) => updateMutation.mutate(data)

  const handleDeleteSuccess = () => setOpen(false)
  const handleCompleteSuccess = () => setOpen(false)

  const primaryArea = objective.areas?.[0]
  const borderStyle = primaryArea
    ? areaBorderStyles.find((s) => s.color === primaryArea.color)?.styles
    : undefined
  const progressColor = primaryArea
    ? areaProgressBarStyles.find((s) => s.color === primaryArea.color)?.styles
    : undefined

  const taskItems = useMemo(() => {
    const grouped = (tasksData?.tasks ?? {}) as Record<string, { id: string; title: string }[]>
    const incomplete = incompleteStatusIds.flatMap((id) => grouped[id] ?? [])
    const linked = objective.tasks ?? []
    const linkedDone = linked.filter((task) => task.status?.label === 'DONE')
    const merged = [...incomplete, ...linkedDone]
    const seen = new Set<string>()
    return merged
      .filter((task) => {
        if (seen.has(task.id)) return false
        seen.add(task.id)
        return true
      })
      .map((task) => ({ id: task.id, label: task.title }))
  }, [tasksData, objective.tasks, incompleteStatusIds])

  const habitItems = useMemo(() => {
    return (habitsData?.habits ?? []).map((habit) => ({ id: habit.id, label: habit.name }))
  }, [habitsData])

  const { totalTasks, doneTasks, pendingTasks, totalHabits } = useMemo(() => {
    const tasks = objective.tasks ?? []
    const done = tasks.filter((t) => t.status?.label === 'DONE' || t.statusId === doneStatusId).length
    return {
      totalTasks: tasks.length,
      doneTasks: done,
      pendingTasks: tasks.length - done,
      totalHabits: objective.habits?.length ?? 0
    }
  }, [objective.tasks, objective.habits, doneStatusId])

  const hasAnyLinks = totalTasks > 0 || totalHabits > 0
  const hasActiveLinks = pendingTasks > 0 || totalHabits > 0
  const taskProgressPct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div
          className={`group border-foreground/20 bg-background hover:border-primary hover:bg-accent/30 flex h-full w-full cursor-pointer flex-col rounded-lg border-2 p-4 transition-all duration-200 hover:scale-[1.02] ${
            borderStyle ? `border-l-8 ${borderStyle}` : ''
          }`}
        >
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-1 flex-col gap-1">
              <h4 className="text-sm leading-tight font-semibold">{objective.name}</h4>
              <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Calendar className="size-3" />
                <span>{objective.dueDate ? formatDate(objective.dueDate) : t('objectives.no_date')}</span>
              </div>
            </div>
            {objective.areas && objective.areas.length > 0 && (
              <div className="flex shrink-0 gap-2">
                {objective.areas.map((area) => {
                  const areaStyle = areaSimpleStyles.find((defaultArea) => defaultArea.color === area.color)
                  const currentIcon = allIcons.find((icon) => icon.name === area.icon)
                  if (!areaStyle || !currentIcon) return null
                  return (
                    <div key={area.id} title={t(area.name)}>
                      <currentIcon.component className={`size-4 ${areaStyle.styles}`} />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          {objective.description && (
            <p className="text-muted-foreground mt-3 line-clamp-2 text-sm leading-relaxed">{objective.description}</p>
          )}
          {hasAnyLinks && (
            <div className="mt-3 flex items-center gap-3 text-[11px]">
              {totalTasks > 0 && (
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-muted-foreground tabular-nums">
                    {t('objectives.progress', { done: doneTasks, total: totalTasks })}
                  </span>
                  <div className="bg-foreground/10 h-1 flex-1 overflow-hidden rounded-full">
                    <div
                      className={`h-full rounded-full transition-all ${progressColor ?? 'bg-primary'}`}
                      style={{ width: `${taskProgressPct}%` }}
                    />
                  </div>
                </div>
              )}
              {totalHabits > 0 && (
                <span className="text-muted-foreground inline-flex items-center gap-1 tabular-nums">
                  <Repeat className="size-3" />
                  {totalHabits}
                </span>
              )}
            </div>
          )}
          {hasActiveLinks ? (
            <div className="border-foreground/10 mt-3 border-t pt-3">
              <ObjectiveSummaryList
                title={objective.name}
                tasks={objective.tasks || []}
                habits={objective.habits || []}
              />
            </div>
          ) : hasAnyLinks ? (
            <div className="border-foreground/10 mt-3 flex items-center justify-center gap-2 border-t pt-3">
              <Check className="size-3.5 text-emerald-500" />
              <p className="text-muted-foreground text-xs">{t('objectives.all_done')}</p>
            </div>
          ) : (
            <div className="border-foreground/10 mt-3 border-t pt-3">
              <p className="text-muted-foreground text-xs">{t('objectives.no_tasks_or_habits')}</p>
            </div>
          )}
        </div>
      </DialogTrigger>

      <DialogContent className="sm:max-w-150">
        <DialogHeader>
          <DialogTitle>{t('objectives.update.title')}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 p-1">
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <TextInput
                {...field}
                type="text"
                placeholder={t('create_objective_dialog.name_placeholder')}
                className="h-9 w-full"
                tabIndex={-1}
                {...(errors.name?.message && { errorMessage: t(errors.name.message.toString()) })}
              />
            )}
          />
          <Controller
            name="description"
            control={control}
            render={({ field }) => (
              <Textarea
                placeholder={t('create_objective_dialog.description_placeholder')}
                className="h-20 w-full resize-none"
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name="dueDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                placeholder={t('create_objective_dialog.due_date_placeholder')}
                value={typeof field.value === 'string' ? new Date(field.value) : field.value}
                onChange={field.onChange}
              />
            )}
          />
          <MultiSelect
            name="areas"
            control={control}
            items={areasData?.areas.map((a) => ({ id: a.id, label: t(a.name) })) || []}
            placeholder={t('create_objective_dialog.select_areas_placeholder')}
          />
          <MultiSelect
            name="tasks"
            control={control}
            items={taskItems}
            placeholder={t('create_objective_dialog.select_tasks_placeholder')}
          />
          <MultiSelect
            name="habits"
            control={control}
            items={habitItems}
            placeholder={t('create_objective_dialog.select_habits_placeholder')}
          />
        </div>

        <DialogFooter className="flex h-auto justify-end">
          <div className="mr-auto flex gap-2">
            <ConfirmDeleteObjectiveDialog objective={objective} onDeleteSuccess={handleDeleteSuccess} />
            <ConfirmCompleteObjectiveDialog objective={objective} onCompleteSuccess={handleCompleteSuccess} />
          </div>
          <div className="flex gap-2">
            <DialogClose asChild className="hover:bg-foreground/10 cursor-pointer">
              <Button variant="outline">{t('cancel')}</Button>
            </DialogClose>
            <LoaderButton
              className="cursor-pointer"
              disabled={!isValid || !isDirty}
              isLoading={updateMutation.isPending}
              onClick={handleSubmit((data) => onSubmit(data as UpdateObjectiveBodyType))}
              label={t('save_changes')}
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
