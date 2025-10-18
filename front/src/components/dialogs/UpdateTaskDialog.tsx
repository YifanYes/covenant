import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useCalendarStore } from '@/hooks/use-calendar-store'
import { useSnackbar } from '@/hooks/use-snackbar'
import { useTasksStore } from '@/hooks/use-tasks-store'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useMutation } from '@tanstack/react-query'
import dayjs from 'dayjs'
import { isNil, isUndefined, map } from 'es-toolkit/compat'
import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { TaskStatus, updateTaskSchema, type UpdateTaskType } from '../../../../server/schemas/tasks.schemas'
import LoaderButton from '../LoaderButton'
import { DatePicker } from '../forms/DatePicker'
import SingleSelect from '../forms/SingleSelect'
import TextInput from '../forms/TextInput'
import { Textarea } from '../ui/textarea'

export const UpdateTaskDialog = ({ callback }: { callback?: () => Promise<unknown> }) => {
  const { t } = useTranslation()
  const { show } = useSnackbar()
  const { monthIndex } = useCalendarStore()
  const { selectedTask, setSelectedTask } = useTasksStore()

  const updateMutation = useMutation(
    trpc.tasks.update.mutationOptions({
      onSuccess: async () => {
        show({ variant: 'success', title: t('tasks.success.update') })
        queryClient
          .invalidateQueries({
            queryKey: trpc.tasks.getByDate.queryKey({
              monthIndex: monthIndex.toString(),
              year: dayjs().year().toString()
            })
          })
          .then(() => callback && callback?.())
          .then(() => setSelectedTask(undefined))
      },
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('tasks.error.internal.update')
        })
      }
    })
  )

  const deleteMutation = useMutation(
    trpc.tasks.delete.mutationOptions({
      onSuccess: async () => {
        show({ variant: 'success', title: t('tasks.success.delete') })
        await queryClient.invalidateQueries({
          queryKey: trpc.tasks.getByDate.queryKey({
            monthIndex: monthIndex.toString(),
            year: dayjs().year().toString()
          })
        })
        await callback?.()
        setSelectedTask(undefined)
      },
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('tasks.error.internal.delete')
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
  } = useForm<UpdateTaskType>({
    resolver: standardSchemaResolver(updateTaskSchema),
    mode: 'onSubmit'
  })

  const onDelete = () => !isUndefined(selectedTask) && deleteMutation.mutate({ id: selectedTask.id })
  const onUpdate = (data: UpdateTaskType) => updateMutation.mutate(data)

  const handleOpenChange = () => {
    setSelectedTask(undefined)
    reset()
  }

  useEffect(() => {
    selectedTask &&
      reset({
        ...selectedTask,
        objectives: map(selectedTask?.objectives, (objective) => objective.id),
        dueDate: !isNil(selectedTask?.dueDate) ? new Date(selectedTask.dueDate) : undefined
      })
  }, [selectedTask, reset])

  return (
    <Dialog open={!isUndefined(selectedTask)} onOpenChange={handleOpenChange}>
      <DialogContent className='sm:max-w-[425px]' aria-describedby='update-task-dialog-desc'>
        <DialogHeader>
          <DialogTitle>{t('update_task_dialog.title')}</DialogTitle>
          <DialogDescription className='sr-only'>{t('update_task_dialog.description')}</DialogDescription>
        </DialogHeader>
        <div className='grid gap-4' key={`update-task-form-${open}`}>
          <div className='grid gap-3'>
            <TextInput
              type='text'
              placeholder={t('update_task_dialog.title_placeholder')}
              className='h-9'
              {...register('title')}
              {...(errors.title?.message && { errorMessage: t(errors.title.message.toString()) })}
            />
          </div>
          <div className='grid gap-3'>
            <Textarea
              placeholder={t('update_task_dialog.description_placeholder')}
              className='min-h-[80px] resize-none'
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
                  options={map(TaskStatus, (status) => ({ value: status, label: t(status) }))}
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
                  value={field.value}
                  onChange={field.onChange}
                  placeholder={t('update_task_dialog.due_date_placeholder')}
                />
              )}
            />
          </div>
        </div>
        <DialogFooter className='flex h-auto justify-between'>
          <LoaderButton
            className='text-destructive border-destructive hover:text-background hover:bg-destructive h-auto cursor-pointer border-2 bg-transparent'
            isLoading={deleteMutation.isPending}
            disabled={isUndefined(selectedTask)}
            onClick={onDelete}
            label={t('tasks.delete')}
          />
          <div className='ml-auto flex gap-2'>
            <DialogClose asChild className='hover:bg-foreground/10 cursor-pointer'>
              <Button variant='outline'>{t('cancel')}</Button>
            </DialogClose>
            <LoaderButton
              className='h-auto cursor-pointer'
              isLoading={updateMutation.isPending}
              disabled={!isValid || !isDirty}
              onClick={handleSubmit(onUpdate)}
              label={t('update')}
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
