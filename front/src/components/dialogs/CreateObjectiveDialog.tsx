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
import { queryClient, trpc } from '@/utils/trpc.utils'
import { zodResolver } from '@hookform/resolvers/zod'
import { createObjectiveSchema, type CreateObjectiveBodyType } from '@schemas/objectives.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import LoaderButton from '../LoaderButton'
import DatePicker from '../forms/DatePicker'
import MultiSelect from '../forms/MultiSelect'
import TextInput from '../forms/TextInput'
import { Textarea } from '../ui/textarea'

export const CreateObjectiveDialog = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { show } = useSnackbar()

  const { data: areasData } = useSuspenseQuery(trpc.areas.getAll.queryOptions())

  const mutation = useMutation(
    trpc.objectives.create.mutationOptions({
      onSuccess: () => {
        show({ variant: 'success', title: t('create_objective_dialog.success') })
        queryClient.invalidateQueries({ queryKey: trpc.objectives.getAll.queryKey() })
        setOpen(false)
      },
      onError: (error) => {
        console.error(error)
        show({
          variant: 'destructive',
          title: t('create_objective_dialog.error.internal')
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
  } = useForm<CreateObjectiveBodyType>({
    // cast resolver to match date transform
    resolver: zodResolver(createObjectiveSchema) as Resolver<CreateObjectiveBodyType>,
    mode: 'onTouched',
    defaultValues: {
      name: '',
      description: '',
      dueDate: undefined,
      areas: []
    }
  })

  const onSubmit = (data: CreateObjectiveBodyType) => mutation.mutate(data)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          <span>{t('objectives.add')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[500px]' aria-describedby='create-objective-dialog-desc'>
        <DialogHeader>
          <DialogTitle>{t('create_objective_dialog.title')}</DialogTitle>
          <DialogDescription className='sr-only'>
            {t('create_objective_dialog.description') || 'Dialog to create a new objective'}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4'>
          <TextInput
            type='text'
            placeholder={t('create_objective_dialog.name_placeholder')}
            className='h-9'
            {...register('name')}
            {...(errors.name?.message && { errorMessage: t(errors.name.message.toString()) })}
            required
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
                value={field.value}
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
          <DialogClose asChild className='hover:bg-foreground/10 cursor-pointer'>
            <Button variant='outline'>{t('cancel')}</Button>
          </DialogClose>
          <LoaderButton
            className='h-auto cursor-pointer'
            disabled={!isValid || !isDirty}
            isLoading={mutation.isPending}
            onClick={handleSubmit(onSubmit)}
            label={t('save_changes')}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
