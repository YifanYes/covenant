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
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { useMutation } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { createAreaSchema, type CreateAreaBodyType } from '../../../../server/schemas/areas.schemas'
import LoaderButton from '../LoaderButton'
import ColorSelector from '../forms/ColorSelector'
import IconPicker from '../forms/IconPicker'
import TextInput from '../forms/TextInput'

export const CreateAreaDialog = () => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { show } = useSnackbar()

  const mutation = useMutation(
    trpc.areas.create.mutationOptions({
      onSuccess: () => {
        show({ variant: 'success', title: t('areas.success.create') })
        queryClient.invalidateQueries({ queryKey: trpc.areas.getAll.queryKey() })
        setOpen(false)
      },
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('areas.error.internal.create')
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
  } = useForm<CreateAreaBodyType>({ resolver: standardSchemaResolver(createAreaSchema), mode: 'onTouched' })

  const onSubmit = (data: CreateAreaBodyType) => mutation.mutate(data)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    !isOpen && reset()
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
