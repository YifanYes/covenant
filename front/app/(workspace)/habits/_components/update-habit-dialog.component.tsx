'use client'
import BaseFormDialog from '@/common/base-form-dialog.component'
import AreasSelector from '@/forms/areas-selector.component'
import ObjectivesSelector from '@/forms/objectives-selector.component'
import SingleSelect from '@/forms/single-select.component'
import TextInput from '@/forms/text-input.component'
import type { Habit } from '@/types/models.types'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpc, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { HabitTimespan, updateHabitSchema, type UpdateHabitType } from '@shared/schemas/habits.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { map } from 'es-toolkit/compat'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import ConfirmDeleteHabitDialog from './confirm-delete-habit-dialog.component'
import HabitCard from './habit-card.component'

export default function UpdateHabitDialog({ habit }: { habit: Habit }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data: objectivesData } = useSuspenseQuery(trpcOptions.objectives.getAll.queryOptions())
  const { data: areasData } = useSuspenseQuery(trpcOptions.areas.getAll.queryOptions())

  const updateMutation = useMutation(
    trpcOptions.habits.update.mutationOptions({
      onSuccess: async () => {
        toast.success(t('habits.success.update'))
        await queryClient.invalidateQueries({ queryKey: trpc.habits.getAll.queryKey() })
        setOpen(false)
      },
      onError: (error) => toast.error(t('habits.error.internal.update'), { description: error.message })
    })
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<UpdateHabitType>({
    resolver: standardSchemaResolver(updateHabitSchema),
    mode: 'onSubmit',
    defaultValues: {
      id: habit.id,
      name: habit.name,
      description: habit.description || '',
      recurrence: habit.recurrence,
      timespan: habit.timespan as HabitTimespan,
      objectives: [],
      areas: []
    }
  })

  // Reset form with habit data when habit changes or dialog opens
  useEffect(() => {
    if (open) {
      reset({
        id: habit.id,
        name: habit.name,
        description: habit.description || '',
        recurrence: habit.recurrence,
        timespan: habit.timespan as HabitTimespan,
        objectives: map(habit.objectives || [], (objective) => objective.id),
        areas: map(habit.areas || [], (area) => area.id)
      })
    }
  }, [open, habit, reset])

  const onSubmit = (data: UpdateHabitType) => updateMutation.mutate(data)

  const handleDeleteSuccess = () => setOpen(false)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    reset()
  }

  const timespanOptions = Object.values(HabitTimespan).map((timespan) => ({
    value: timespan,
    label: t(`habits.timespan.${timespan.toLowerCase()}`)
  }))

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title='update_habit_dialog.title'
      description='update_habit_dialog.description'
      onSubmit={handleSubmit(onSubmit)}
      submitLabel='save_changes'
      isLoading={updateMutation.isPending}
      isSubmitDisabled={!isValid || !isDirty}
      extraFooterActions={<ConfirmDeleteHabitDialog habit={habit} onDeleteSuccess={handleDeleteSuccess} />}
      trigger={<HabitCard habit={habit} />}
    >
      <div className='grid gap-4'>
        <div className='grid gap-3'>
          <TextInput
            type='text'
            label={t('create_habit_dialog.name_placeholder')}
            placeholder={t('create_habit_dialog.name_placeholder')}
            className='h-9'
            {...register('name')}
            {...(errors.name?.message && { errorMessage: t(errors.name.message.toString()) })}
            tabIndex={-1}
            required
          />
        </div>
        <div className='grid gap-3'>
          <Textarea
            placeholder={t('create_habit_dialog.description_placeholder')}
            className='h-20 resize-none overflow-y-auto'
            {...register('description')}
            {...(errors.description?.message && { errorMessage: t(errors.description.message.toString()) })}
          />
        </div>
        <div className='grid gap-3'>
          <TextInput
            type='number'
            label={t('create_habit_dialog.recurrence_placeholder')}
            placeholder={t('create_habit_dialog.recurrence_placeholder')}
            className='h-9'
            min={1}
            {...register('recurrence', { valueAsNumber: true })}
            {...(errors.recurrence?.message && { errorMessage: t(errors.recurrence.message.toString()) })}
            required
          />
        </div>
        <div className='grid gap-3'>
          <Controller
            name='timespan'
            control={control}
            render={({ field }) => (
              <SingleSelect
                label={t('create_habit_dialog.timespan_placeholder')}
                placeholder={t('create_habit_dialog.timespan_placeholder')}
                options={timespanOptions}
                value={field.value}
                onChange={(value) => field.onChange(value || HabitTimespan.DAILY)}
                required
              />
            )}
          />
        </div>
        <div className='grid min-w-0 gap-3'>
          <ObjectivesSelector
            control={control}
            objectives={objectivesData?.objectives || []}
            placeholder={t('create_habit_dialog.objectives_placeholder')}
            label={t('create_habit_dialog.objectives_placeholder')}
          />
        </div>
        <div className='grid min-w-0 gap-3'>
          <AreasSelector
            control={control}
            areas={areasData?.areas || []}
            placeholder={t('create_habit_dialog.areas_placeholder')}
            label={t('create_habit_dialog.areas_placeholder')}
          />
        </div>
      </div>
    </BaseFormDialog>
  )
}
