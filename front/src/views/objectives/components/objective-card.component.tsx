import LoaderButton from '@/common/loader-button.component'
import DatePicker from '@/forms/date-picker.component'
import MultiSelect from '@/forms/multi-select.component'
import TextInput from '@/forms/text-input.component'
import { areaSimpleStyles } from '@/types/colors.types'
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
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { updateObjectiveSchema, type UpdateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import ConfirmCompleteObjectiveDialog from './confirm-complete-objective-dialog.component'
import ConfirmDeleteObjectiveDialog from './confirm-delete-objective-dialog.component'
import ObjectiveSummaryList from './objective-summary-list.component'

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
  } = useForm<UpdateObjectiveBodyType>({
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
  const handleCompleteSuccess = () => setOpen(false)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div className='group border-foreground/20 bg-background hover:border-primary hover:bg-accent/30 flex h-full w-full cursor-pointer flex-col rounded-lg border-2 p-4 transition-all duration-200 hover:scale-[1.02]'>
          <div className='flex items-start justify-between gap-6'>
            <div className='flex flex-1 flex-col gap-1'>
              <h4 className='text-sm leading-tight font-semibold'>{objective.name}</h4>
              <div className='text-muted-foreground text-xs'>
                {objective.dueDate ? dayjs(objective.dueDate).format('L') : t('objectives.no_date')}
              </div>
            </div>
            {objective.areas && objective.areas.length > 0 && (
              <div className='flex shrink-0 gap-2'>
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
            <p className='text-muted-foreground mt-4 line-clamp-2 text-sm leading-relaxed'>{objective.description}</p>
          )}
          {(objective.tasks && objective.tasks.length > 0) || (objective.habits && objective.habits.length > 0) ? (
            <div className='mt-4 border-t pt-4'>
              <ObjectiveSummaryList
                title={objective.name}
                tasks={objective.tasks || []}
                habits={objective.habits || []}
              />
            </div>
          ) : (
            <div className='mt-4 flex flex-1 items-center justify-center border-t pt-6 pb-4'>
              <p className='text-muted-foreground text-center text-xs italic'>{t('objectives.no_tasks_or_habits')}</p>
            </div>
          )}
        </div>
      </DialogTrigger>

      <DialogContent className='sm:max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>{t('objectives.update.title')}</DialogTitle>
        </DialogHeader>

        <div className='grid gap-4 p-1'>
          <Controller
            name='name'
            control={control}
            render={({ field }) => (
              <TextInput
                {...field}
                type='text'
                placeholder={t('create_objective_dialog.name_placeholder')}
                className='h-9 w-full'
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
                className='h-20 w-full resize-none'
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
          <div className='mr-auto flex gap-2'>
            <ConfirmDeleteObjectiveDialog objective={objective} onDeleteSuccess={handleDeleteSuccess} />
            <ConfirmCompleteObjectiveDialog objective={objective} onCompleteSuccess={handleCompleteSuccess} />
          </div>
          <div className='flex gap-2'>
            <DialogClose asChild className='hover:bg-foreground/10 cursor-pointer'>
              <Button variant='outline'>{t('cancel')}</Button>
            </DialogClose>
            <LoaderButton
              className='cursor-pointer'
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
