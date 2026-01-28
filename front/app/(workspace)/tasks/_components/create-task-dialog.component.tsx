'use client'
import BaseFormDialog from '@/common/base-form-dialog.component'
import AreasSelector from '@/forms/areas-selector.component'
import ColorSelector from '@/forms/color-selector.component'
import DatePicker from '@/forms/date-picker.component'
import ObjectivesSelector from '@/forms/objectives-selector.component'
import SingleSelect from '@/forms/single-select.component'
import TextInput from '@/forms/text-input.component'
import { useCalendarStore } from '@/stores/calendar.store'
import Button from '@/ui/button.component'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Plus } from '@nsmr/pixelart-react'
import {
  createTaskSchema,
  TaskEffort,
  TaskImpact,
  TaskStatus,
  type CreateTaskType
} from '@shared/schemas/tasks.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function CreateTaskDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { monthIndex } = useCalendarStore()
  const { data: objectivesData } = useSuspenseQuery(trpc.objectives.getAll.queryOptions())
  const { data: areasData } = useSuspenseQuery(trpc.areas.getAll.queryOptions())

  const mutation = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: async () => {
        toast.success(t('tasks.success.create'))
        queryClient.invalidateQueries({
          queryKey: trpc.tasks.getByDate.queryKey({
            monthIndex: monthIndex.toString(),
            year: dayjs().year().toString()
          })
        })
        await queryClient.invalidateQueries({ queryKey: trpc.tasks.getAll.queryKey() })
        await queryClient.invalidateQueries({ queryKey: trpc.tasks.getFiltered.queryKey() })
        setOpen(false)
      },
      onError: (error) => toast.error(t('tasks.error.internal.create'), { description: error.message })
    })
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<CreateTaskType>({
    resolver: standardSchemaResolver(createTaskSchema),
    mode: 'onSubmit',
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatus.TODO,
      dueDate: undefined,
      objectives: [],
      areas: []
    }
  })

  const onSubmit = (data: CreateTaskType) => mutation.mutate(data as CreateTaskType)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    reset()
  }

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title='create_task_dialog.title'
      description='create_task_dialog.description'
      onSubmit={handleSubmit(onSubmit)}
      submitLabel='create'
      isLoading={mutation.isPending}
      isSubmitDisabled={!isValid || !isDirty}
      trigger={
        <Button>
          <Plus />
          <span>{t('tasks.add')}</span>
        </Button>
      }
      className='md:max-w-fit md:min-w-150'
    >
      <div className='grid gap-4'>
        <div className='grid gap-3'>
          <TextInput
            type='text'
            placeholder={t('create_task_dialog.title_placeholder')}
            className='h-9'
            {...register('title')}
            {...(errors.title?.message && { errorMessage: t(errors.title.message.toString()) })}
            required
          />
        </div>
        <div className='grid gap-3'>
          <Textarea
            placeholder={t('create_task_dialog.description_placeholder')}
            className='h-20 resize-none overflow-y-auto'
            {...register('description')}
            {...(errors.description?.message && { errorMessage: t(errors.description.message.toString()) })}
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
                placeholder={t('create_task_dialog.due_date_placeholder')}
              />
            )}
          />
        </div>
        <div className='grid min-w-0 gap-3'>
          <ObjectivesSelector
            control={control}
            objectives={objectivesData?.objectives || []}
            placeholder={t('create_task_dialog.objectives_placeholder')}
          />
        </div>
        <div className='grid min-w-0 gap-3'>
          <AreasSelector
            control={control}
            areas={areasData?.areas || []}
            placeholder={t('create_task_dialog.areas_placeholder')}
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
