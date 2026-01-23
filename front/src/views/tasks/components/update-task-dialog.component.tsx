import BaseFormDialog from '@/common/base-form-dialog.component'
import LoaderButton from '@/common/loader-button.component'
import ColorSelector from '@/forms/color-selector.component'
import DatePicker from '@/forms/date-picker.component'
import ObjectivesSelector from '@/forms/objectives-selector.component'
import SingleSelect from '@/forms/single-select.component'
import TextInput from '@/forms/text-input.component'
import { useCalendarStore } from '@/stores/calendar.store'
import { useTasksStore } from '@/stores/tasks.store'
import Textarea from '@/ui/textarea.component'
import { getRewardText } from '@/utils/text.utils'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import {
  TaskEffort,
  TaskImpact,
  TaskStatus,
  updateTaskSchema,
  type UpdateTaskType
} from '@shared/schemas/tasks.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { isNil, isUndefined, map } from 'es-toolkit/compat'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function UpdateTaskDialog() {
  const { t } = useTranslation()
  const { monthIndex } = useCalendarStore()
  const { selectedTask, setSelectedTask } = useTasksStore()
  const { data: objectivesData } = useSuspenseQuery(trpc.objectives.getAll.queryOptions())

  const updateMutation = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: async (data: { diceEarned: number }) => {
        toast.success(t('tasks.success.update', { diceReward: getRewardText(data.diceEarned) }))
        await queryClient.invalidateQueries({
          queryKey: trpc.tasks.getByDate.queryKey({
            monthIndex: monthIndex.toString(),
            year: dayjs().year().toString()
          })
        })
        await queryClient.invalidateQueries({ queryKey: trpc.tasks.getAll.queryKey() })
        setSelectedTask(undefined)
      },
      onError: (error) => toast.error(t('tasks.error.internal.update'), { description: error.message })
    })
  )

  const deleteMutation = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: async () => {
        toast.success(t('tasks.success.delete'))
        await queryClient.invalidateQueries({
          queryKey: trpc.tasks.getByDate.queryKey({
            monthIndex: monthIndex.toString(),
            year: dayjs().year().toString()
          })
        })
        await queryClient.invalidateQueries({ queryKey: trpc.tasks.getAll.queryKey() })
        setSelectedTask(undefined)
      },
      onError: (error) => toast.error(t('tasks.error.internal.delete'), { description: error.message })
    })
  )

  const duplicateMutation = useMutation(
    trpc.tasks.duplicate.mutationOptions({
      onSuccess: async () => {
        toast.success(t('tasks.success.duplicate'))
        await queryClient.invalidateQueries({
          queryKey: trpc.tasks.getByDate.queryKey({
            monthIndex: monthIndex.toString(),
            year: dayjs().year().toString()
          })
        })
        await queryClient.invalidateQueries({ queryKey: trpc.tasks.getAll.queryKey() })
        setSelectedTask(undefined)
      },
      onError: (error) => toast.error(t('tasks.error.internal.duplicate'), { description: error.message })
    })
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<UpdateTaskType>({
    resolver: standardSchemaResolver(updateTaskSchema),
    mode: 'onSubmit'
  })

  const onDelete = () => !isUndefined(selectedTask) && deleteMutation.mutate({ id: selectedTask.id })
  const onUpdate = (data: UpdateTaskType) => updateMutation.mutate(data)
  const onDuplicate = () =>
    !isUndefined(selectedTask) &&
    duplicateMutation.mutate({ id: selectedTask.id, titleSuffix: t('copy_suffix', { defaultValue: '(Copy)' }) })

  const handleOpenChange = () => {
    setSelectedTask(undefined)
    reset()
  }

  useEffect(() => {
    selectedTask &&
      reset({
        ...selectedTask,
        objectives: map(selectedTask?.objectives, (objective) => objective.id),
        dueDate: !isNil(selectedTask?.dueDate) ? new Date(selectedTask.dueDate) : undefined,
        effort: selectedTask?.effort as TaskEffort | undefined,
        impact: selectedTask?.impact as TaskImpact | undefined
      })
  }, [selectedTask, reset])

  return (
    <BaseFormDialog
      open={!isUndefined(selectedTask)}
      onOpenChange={handleOpenChange}
      title='update_task_dialog.title'
      description='update_task_dialog.description'
      onSubmit={handleSubmit(onUpdate)}
      submitLabel='update'
      isLoading={updateMutation.isPending}
      isSubmitDisabled={!isValid || !isDirty || updateMutation.isPending}
      className='md:max-w-fit md:min-w-[600px]'
      extraFooterActions={
        <div className='mr-auto flex gap-2'>
          <LoaderButton
            className='text-destructive border-destructive hover:text-background hover:bg-destructive cursor-pointer border bg-transparent'
            isLoading={deleteMutation.isPending}
            disabled={isUndefined(selectedTask)}
            onClick={onDelete}
            label={t('tasks.delete')}
          />
          <LoaderButton
            className='text-accent border-accent hover:text-background hover:bg-accent cursor-pointer border bg-transparent'
            isLoading={duplicateMutation.isPending}
            disabled={isUndefined(selectedTask)}
            onClick={onDuplicate}
            label={t('tasks.duplicate')}
          />
        </div>
      }
    >
      <div className='grid gap-4'>
        <div className='grid gap-3'>
          <TextInput
            type='text'
            placeholder={t('update_task_dialog.title_placeholder')}
            className='h-9'
            {...register('title')}
            {...(errors.title?.message && { errorMessage: t(errors.title.message.toString()) })}
            required
          />
        </div>
        <div className='grid gap-3'>
          <Textarea
            placeholder={t('update_task_dialog.description_placeholder')}
            className='h-[80px] resize-none overflow-y-auto'
            {...register('description')}
            {...(errors.description?.message && { errorMessage: t(errors.description.message.toString()) })}
          />
        </div>
        <div className='grid gap-3'>
          <Controller
            name='status'
            control={control}
            render={({ field }) => (
              <SingleSelect
                value={field.value}
                placeholder={t('update_task_dialog.status_placeholder')}
                options={map(TaskStatus, (status) => ({ value: status, label: t(`task_status.${status}`) }))}
                onChange={field.onChange}
              />
            )}
          />
        </div>
        <div className='grid gap-3'>
          <Controller
            name='dueDate'
            control={control}
            render={({ field }) => (
              <DatePicker
                className='w-full'
                value={typeof field.value === 'string' ? new Date(field.value) : field.value}
                onChange={field.onChange}
                placeholder={t('update_task_dialog.due_date_placeholder')}
              />
            )}
          />
        </div>
        <div className='grid min-w-0 gap-3'>
          <ObjectivesSelector
            control={control}
            objectives={objectivesData?.objectives || []}
            placeholder={t('update_task_dialog.objectives_placeholder')}
          />
        </div>
        <div className='grid gap-3'>
          <Controller
            name='color'
            control={control}
            render={({ field }) => (
              <ColorSelector label={t('tasks.color')} value={field.value ?? undefined} onChange={field.onChange} />
            )}
          />
        </div>
        <div className='grid grid-cols-2 gap-3'>
          <Controller
            name='effort'
            control={control}
            render={({ field }) => (
              <SingleSelect
                label={t('tasks.effort')}
                placeholder={t('tasks.effort_placeholder')}
                options={Object.values(TaskEffort).map((effortType) => ({
                  value: effortType,
                  label: t(`tasks.effort_values.${effortType}`)
                }))}
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value)}
              />
            )}
          />
          <Controller
            name='impact'
            control={control}
            render={({ field }) => (
              <SingleSelect
                label={t('tasks.impact')}
                placeholder={t('tasks.impact_placeholder')}
                options={Object.values(TaskImpact).map((impactType) => ({
                  value: impactType,
                  label: t(`tasks.impact_values.${impactType}`)
                }))}
                value={field.value ?? undefined}
                onChange={(value) => field.onChange(value)}
              />
            )}
          />
        </div>
      </div>
    </BaseFormDialog>
  )
}
