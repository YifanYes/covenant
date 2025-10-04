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
import { useSnackbar } from '@/hooks/use-snackbar'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { createTaskSchema, TaskStatus, type CreateTaskType } from '../../../../server/schemas/tasks.schemas'
import LoaderButton from '../LoaderButton'
import { DatePicker } from '../forms/DatePicker'
import TextInput from '../forms/TextInput'
import { Textarea } from '../ui/textarea'

export const CreateTaskDialog = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { show } = useSnackbar()
  const { monthIndex } = useCalendarStore()

  const mutation = useMutation(
    trpc.tasks.create.mutationOptions({
      onSuccess: () => {
        show({ variant: 'success', title: t('tasks.success.create') })
        queryClient.invalidateQueries({
          queryKey: trpc.tasks.getByDate.queryKey({
            monthIndex: monthIndex.toString(),
            year: dayjs().year().toString()
          })
        })
        setOpen(false)
      },
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('tasks.error.internal.create')
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
  } = useForm<CreateTaskType>({
    resolver: standardSchemaResolver(createTaskSchema),
    mode: 'onSubmit',
    defaultValues: {
      title: '',
      description: '',
      status: TaskStatus.TODO,
      dueDate: undefined
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
