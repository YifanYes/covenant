import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Plus } from '@nsmr/pixelart-react'
import { createHabitSchema, HabitTimespan, type CreateHabitType } from '@shared/schemas/habits.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import LoaderButton from '../LoaderButton'
import MultiSelect from '../forms/MultiSelect'
import SingleSelect from '../forms/SingleSelect'
import TextInput from '../forms/TextInput'
import { Textarea } from '../ui/textarea'

export const CreateHabitDialog = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const { data: objectivesData } = useSuspenseQuery(trpc.objectives.getAll.queryOptions())

  const mutation = useMutation(
    trpc.habits.create.mutationOptions({
      onSuccess: async () => {
        toast.success(t('habits.success.create'))
        await queryClient.invalidateQueries({ queryKey: trpc.habits.getAll.queryKey() })
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
    mode: 'onTouched',
    defaultValues: {
      name: '',
      description: '',
      recurrence: 1,
      timespan: HabitTimespan.DAILY,
      objectives: []
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          <span>{t('habits.add')}</span>
        </Button>
      </DialogTrigger>

      <DialogContent className='sm:max-w-[425px]' aria-describedby='create-habit-dialog-desc'>
        <DialogHeader>
          <DialogTitle>{t('create_habit_dialog.title')}</DialogTitle>
          <DialogDescription className='sr-only'>
            {t('create_habit_dialog.description') || 'Dialog to create a new habit'}
          </DialogDescription>
        </DialogHeader>

        <div className='grid gap-4' key={`create-habit-form-${open}`}>
          <div className='grid gap-3'>
            <TextInput
              type='text'
              label={t('create_habit_dialog.name_placeholder')}
              placeholder={t('create_habit_dialog.name_placeholder')}
              className='h-9'
              {...register('name')}
              {...(errors.name?.message && { errorMessage: t(errors.name.message.toString()) })}
              required
            />
          </div>
          <div className='grid gap-3'>
            <Textarea
              placeholder={t('create_habit_dialog.description_placeholder')}
              className='min-h-[80px] resize-none'
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
          <div className='grid gap-3'>
            <MultiSelect
              name='objectives'
              control={control}
              items={objectivesData?.objectives.map((o) => ({ id: o.id, label: o.name })) || []}
              placeholder={t('create_habit_dialog.objectives_placeholder')}
            />
          </div>
        </div>

        <DialogFooter className='flex h-auto justify-end'>
          <DialogClose asChild className='hover:bg-foreground/10 cursor-pointer'>
            <Button variant='outline'>{t('cancel')}</Button>
          </DialogClose>
          <LoaderButton
            className='h-auto cursor-pointer'
            disabled={!isValid || !isDirty}
            isLoading={mutation.isPending}
            onClick={handleSubmit(onSubmit)}
            label={t('create')}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
