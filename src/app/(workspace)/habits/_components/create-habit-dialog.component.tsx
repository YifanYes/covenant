'use client'
import BaseFormDialog from '@/common/base-form-dialog.component'
import AreasSelector from '@/forms/areas-selector.component'
import ObjectivesSelector from '@/forms/objectives-selector.component'
import SingleSelect from '@/forms/single-select.component'
import TextInput from '@/forms/text-input.component'
import Button from '@/ui/button.component'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Plus } from 'pixelarticons/react'
import { createHabitSchema, HabitTimespan, type CreateHabitType } from '@shared/schemas/habits.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function CreateHabitDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data: objectivesData } = useSuspenseQuery(trpcOptions.objectives.getAll.queryOptions())
  const { data: areasData } = useSuspenseQuery(trpcOptions.areas.getAll.queryOptions())

  const mutation = useMutation(
    trpcOptions.habits.create.mutationOptions({
      onSuccess: async () => {
        toast.success(t('habits.success.create'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.habits.getAll.queryKey() })
        setOpen(false)
      },
      onError: (error) => toast.error(t('habits.error.internal.create'), { description: error.message })
    })
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<CreateHabitType>({
    resolver: standardSchemaResolver(createHabitSchema),
    mode: 'onSubmit',
    defaultValues: {
      name: '',
      description: '',
      recurrence: 1,
      timespan: HabitTimespan.DAILY,
      objectives: [],
      areas: []
    }
  })

  const onSubmit = (data: CreateHabitType) => mutation.mutate(data)

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
      title="create_habit_dialog.title"
      description="create_habit_dialog.description"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="create"
      isLoading={mutation.isPending}
      isSubmitDisabled={!isValid || !isDirty}
      trigger={
        <Button>
          <Plus />
          <span>{t('habits.add')}</span>
        </Button>
      }
    >
      <div className="grid gap-4" key={`create-habit-form-${open}`}>
        <div className="grid gap-3">
          <TextInput
            type="text"
            label={t('create_habit_dialog.name_placeholder')}
            placeholder={t('create_habit_dialog.name_placeholder')}
            className="h-9"
            {...register('name')}
            {...(errors.name?.message && { errorMessage: t(errors.name.message.toString()) })}
            required
          />
        </div>
        <div className="grid gap-3">
          <Textarea
            placeholder={t('create_habit_dialog.description_placeholder')}
            className="min-h-20 resize-none"
            {...register('description')}
            {...(errors.description?.message && { errorMessage: t(errors.description.message.toString()) })}
          />
        </div>
        <div className="grid gap-3">
          <TextInput
            type="number"
            label={t('create_habit_dialog.recurrence_placeholder')}
            placeholder={t('create_habit_dialog.recurrence_placeholder')}
            className="h-9"
            min={1}
            {...register('recurrence', { valueAsNumber: true })}
            {...(errors.recurrence?.message && { errorMessage: t(errors.recurrence.message.toString()) })}
            required
          />
        </div>
        <div className="grid gap-3">
          <Controller
            name="timespan"
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
        <div className="grid min-w-0 gap-3">
          <ObjectivesSelector
            control={control}
            objectives={objectivesData?.objectives || []}
            placeholder={t('create_habit_dialog.objectives_placeholder')}
          />
        </div>
        <div className="grid min-w-0 gap-3">
          <AreasSelector
            control={control}
            areas={areasData?.areas || []}
            placeholder={t('create_habit_dialog.areas_placeholder')}
          />
        </div>
      </div>
    </BaseFormDialog>
  )
}
