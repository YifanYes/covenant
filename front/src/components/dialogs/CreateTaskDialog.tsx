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
import { useCalendarStore } from '@/hooks/use-calendar-store'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus } from '@nsmr/pixelart-react'
import { createTaskSchema, TaskStatus, type CreateTaskType } from '@shared/schemas/tasks.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import LoaderButton from '../LoaderButton'
import ColorSelector from '../forms/ColorSelector'
import DatePicker from '../forms/DatePicker'
import MultiSelect from '../forms/MultiSelect'
import TextInput from '../forms/TextInput'
import { Textarea } from '../ui/textarea'

export const CreateTaskDialog = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { monthIndex } = useCalendarStore()
  const { data: objectivesData } = useSuspenseQuery(trpc.objectives.getAll.queryOptions())

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
    // cast resolver to match date transform
    resolver: zodResolver(createTaskSchema) as Resolver<CreateTaskType>,
    mode: 'onTouched',
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatus.TODO,
      dueDate: undefined,
      objectives: []
    }
  })

  const onSubmit = (data: CreateTaskType) => mutation.mutate(data)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          <span>{t('tasks.add')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]' aria-describedby='create-task-dialog-desc'>
        <DialogHeader>
          <DialogTitle>{t('create_task_dialog.title')}</DialogTitle>
          <DialogDescription className='sr-only'>
            {t('create_task_dialog.description') || 'Dialog to create a new task'}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4' key={`create-task-form-${open}`}>
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
              className='min-h-[80px] resize-none'
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
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('create_task_dialog.due_date_placeholder')}
                />
              )}
            />
          </div>
          <div className='grid gap-3'>
            <MultiSelect
              name='objectives'
              control={control}
              items={objectivesData?.objectives.map(({ id, name: label }) => ({ id, label })) || []}
              placeholder={t('create_task_dialog.objectives_placeholder')}
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
