import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import type { Objective } from '@/types/models.types'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { updateObjectiveSchema, type UpdateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { z } from 'zod'
import AreaBadge from './AreaBadge'
import { ConfirmDeleteObjectiveDialog } from './dialogs/ConfirmDeleteObjectiveDialog'
import DatePicker from './forms/DatePicker'
import MultiSelect from './forms/MultiSelect'
import TextInput from './forms/TextInput'
import LoaderButton from './LoaderButton'
import { Textarea } from './ui/textarea'

export default function ObjectiveCard({ objective }: { objective: Objective }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const { data: areasData } = useSuspenseQuery(trpc.areas.getAll.queryOptions())

  const updateMutation = useMutation(
    trpc.objectives.update.mutationOptions({
      onSuccess: () => {
        toast.success(t('objectives.update.success'))
        queryClient.invalidateQueries({ queryKey: trpc.objectives.getAll.queryKey() })
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
  } = useForm<z.input<typeof updateObjectiveSchema>>({
    resolver: standardSchemaResolver(updateObjectiveSchema),
    mode: 'onTouched',
    defaultValues: {
      id: objective.id,
      name: objective.name,
      description: objective.description || '',
      dueDate: objective.dueDate ? new Date(objective.dueDate) : undefined,
      areas: objective.areas?.map((area) => area.id) || []
    }
  })

  // Reset form with area data when area changes or dialog opens
  useEffect(() => {
    if (open) {
      reset({
        id: objective.id,
        name: objective.name,
        description: objective.description || '',
        dueDate: objective.dueDate ? new Date(objective.dueDate) : undefined,
        areas: objective.areas?.map((area) => area.id) || []
      })
    }
  }, [open, objective, reset])

  const onSubmit = (data: UpdateObjectiveBodyType) => updateMutation.mutate(data)

  const handleDeleteSuccess = () => setOpen(false)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className='w-full cursor-pointer rounded-xl p-4 shadow-sm transition-shadow hover:shadow-md'>
          <div className='pb-2'>
            <h4 className='text-base leading-tight font-semibold'>{objective.name}</h4>
          </div>
          <div className='space-y-0.5 py-0 pb-2'>
            {objective.description && (
              <p className='text-muted-foreground truncate text-sm leading-snug'>{objective.description}</p>
            )}
            {objective.dueDate && (
              <div className='text-muted-foreground text-xs'>{format(new Date(objective.dueDate), 'PPP')}</div>
            )}
          </div>
          <div className='flex flex-wrap gap-1 pt-0'>
            {objective.areas?.map((area) => (
              <AreaBadge key={area.id} area={area} />
            ))}
          </div>
        </div>
      </DialogTrigger>

      <DialogContent className='sm:max-w-[425px]'>
        <DialogHeader>
          <DialogTitle>{t('objectives.update.title')}</DialogTitle>
        </DialogHeader>

        <div className='grid gap-4'>
          <Controller
            name='name'
            control={control}
            render={({ field }) => (
              <TextInput
                {...field}
                type='text'
                placeholder={t('create_objective_dialog.name_placeholder')}
                className='h-9'
                tabIndex={-1}
                {...(errors.name?.message && { errorMessage: t(errors.name.message.toString()) })}
              />
            )}
          />
          <Controller
            name='description'
            control={control}
            render={({ field }) => (
              <Textarea
                placeholder={t('create_objective_dialog.description_placeholder')}
                className='h-20'
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            name='dueDate'
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
            name='areas'
            control={control}
            items={areasData?.areas.map((a) => ({ id: a.id, label: t(a.name) })) || []}
            placeholder={t('create_objective_dialog.select_areas_placeholder')}
          />
        </div>

        <DialogFooter className='flex h-auto justify-end'>
          <ConfirmDeleteObjectiveDialog objective={objective} onDeleteSuccess={handleDeleteSuccess} />
          <div className='flex gap-2'>
            <DialogClose asChild className='hover:bg-foreground/10 cursor-pointer'>
              <Button variant='outline'>{t('cancel')}</Button>
            </DialogClose>
            <LoaderButton
              className='h-auto cursor-pointer'
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
