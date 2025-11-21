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
import { useSnackbar } from '@/hooks/use-snackbar'
import type { Habit } from '@/types/models.types'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { map } from 'es-toolkit/compat'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { HabitTimespan, updateHabitSchema, type UpdateHabitType } from '../../../../server/schemas/habits.schemas'
import LoaderButton from '../LoaderButton'
import MultiSelect from '../forms/MultiSelect'
import SingleSelect from '../forms/SingleSelect'
import TextInput from '../forms/TextInput'
import HabitCard from '../habits/HabitCard'
import { Textarea } from '../ui/textarea'
import { ConfirmDeleteHabitDialog } from './ConfirmDeleteHabitDialog'

export function UpdateHabitDialog({ habit }: { habit: Habit }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { show } = useSnackbar()

  const { data: objectivesData } = useSuspenseQuery(trpc.objectives.getAll.queryOptions())

  const updateMutation = useMutation(
    trpc.habits.update.mutationOptions({
      onSuccess: async () => {
        show({ variant: 'success', title: t('habits.success.update') })
        await queryClient.invalidateQueries({ queryKey: trpc.habits.getAll.queryKey() })
        setOpen(false)
      },
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('habits.error.internal.update')
        })
      }
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
    mode: 'onTouched',
    defaultValues: {
      id: habit.id,
      name: habit.name,
      description: habit.description || '',
      recurrence: habit.recurrence,
      timespan: habit.timespan as HabitTimespan,
      objectives: []
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
        objectives: map(habit.objectives || [], (objective) => objective.id)
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <HabitCard habit={habit} />
      </DialogTrigger>

      <DialogContent className='sm:max-w-[425px]' aria-describedby='update-habit-dialog-desc'>
        <DialogHeader>
          <DialogTitle>{t('update_habit_dialog.title')}</DialogTitle>
          <DialogDescription className='sr-only'>
            {t('update_habit_dialog.description') || 'Dialog to update an existing habit'}
          </DialogDescription>
        </DialogHeader>

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
              label={t('create_habit_dialog.objectives_placeholder')}
            />
          </div>
        </div>

        <DialogFooter className='flex h-auto justify-end'>
          <ConfirmDeleteHabitDialog habit={habit} onDeleteSuccess={handleDeleteSuccess} />
          <div className='flex gap-2'>
            <DialogClose asChild className='hover:bg-foreground/10 cursor-pointer'>
              <Button variant='outline'>{t('cancel')}</Button>
            </DialogClose>
            <LoaderButton
              className='h-auto cursor-pointer'
              disabled={!isValid || !isDirty}
              isLoading={updateMutation.isPending}
              onClick={handleSubmit(onSubmit)}
              label={t('save_changes')}
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
