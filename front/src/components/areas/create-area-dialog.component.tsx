import { LoaderButton } from '@/common'
import { ColorSelector } from '@/forms'
import { IconPicker } from '@/forms'
import { TextInput } from '@/forms'
import { Button } from '@/ui'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/ui'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Plus } from '@nsmr/pixelart-react'
import { createAreaSchema, type CreateAreaBodyType } from '@shared/schemas/areas.schemas'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

const CreateAreaDialog = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const mutation = useMutation(
    trpc.areas.create.mutationOptions({
      onSuccess: () => {
        toast.success(t('areas.success.create'))
        queryClient.invalidateQueries({ queryKey: trpc.areas.getAll.queryKey() })
        setOpen(false)
      },
      onError: (error) => toast.error(t('areas.error.internal.create'), { description: error.message })
    })
  )

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<CreateAreaBodyType>({ resolver: standardSchemaResolver(createAreaSchema), mode: 'onTouched' })

  const onSubmit = (data: CreateAreaBodyType) => mutation.mutate(data)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    reset()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          <span>{t('areas.add')}</span>
        </Button>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]' aria-describedby='create-area-dialog-desc'>
        <DialogHeader>
          <DialogTitle>{t('create_area_dialog.title')}</DialogTitle>
          <DialogDescription className='sr-only'>
            {t('create_area_dialog.description') || 'Dialog to create a new area'}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4'>
          <div className='grid gap-3'>
            <TextInput
              type='text'
              placeholder={t('create_area_dialog.name')}
              className='h-9'
              {...register('name')}
              {...(errors.name?.message && { errorMessage: t(errors.name.message.toString()) })}
              required
            />
          </div>
          <div className='grid gap-3'>
            <Controller
              name='color'
              control={control}
              render={({ field }) => <ColorSelector className='w-full' value={field.value} onChange={field.onChange} />}
            />
          </div>
          <div className='grid gap-3'>
            <Controller
              name='icon'
              control={control}
              render={({ field }) => <IconPicker className='w-full' value={field.value} onChange={field.onChange} />}
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
            label={t('save_changes')}
          />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default CreateAreaDialog
