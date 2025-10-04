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
import type { Area } from '@/types/areas.types'
import { allIcons, areaStyles } from '@/types/constants.types'
import { queryClient, trpc } from '@/utils/trpc'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { updateAreaSchema } from '../../../../server/schemas/areas.schemas'
import LoaderButton from '../LoaderButton'
import ColorSelector from '../forms/ColorSelector'
import IconPicker from '../forms/IconPicker'
import TextInput from '../forms/TextInput'
import { ConfirmDeleteAreaDialog } from './ConfirmDeleteAreaDialog'

export function UpdateAreaDialog({ area }: { area: Area }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { show } = useSnackbar()

  const areaStyle = areaStyles.find((defaultArea) => defaultArea.color === area.color)
  const currentIcon = allIcons.find((icon) => icon.name === area.icon)

  const updateMutation = useMutation(
    trpc.areas.update.mutationOptions({
      onSuccess: () => {
        show({ variant: 'success', title: t('areas.success.create') })
        queryClient.invalidateQueries({ queryKey: trpc.areas.getAll.queryKey() })
        setOpen(false)
      },
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('areas.error.internal.update')
        })
      }
    })
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm({
    resolver: zodResolver(updateAreaSchema),
    mode: 'onTouched',
    defaultValues: {
      id: area.id,
      name: area.name,
      color: area.color || '',
      icon: area.icon || ''
    }
  })

  // Reset form with area data when area changes or dialog opens
  useEffect(() => {
    if (open) {
      reset({
        id: area.id,
        name: area.name,
        color: area.color || '',
        icon: area.icon || ''
      })
    }
  }, [open, area, reset])

  const onSubmit = handleSubmit((data) => updateMutation.mutate(data))

  const handleDeleteSuccess = () => setOpen(false)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    !isOpen && reset()
  }

  return !areaStyle ? null : (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <div
          className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors duration-200 ${areaStyle.styles}`}
        >
          {currentIcon && <currentIcon.component className='size-4' />}
          <span>{t(area.name)}</span>
        </div>
      </DialogTrigger>
      <DialogContent className='sm:max-w-[425px]' aria-describedby='update-area-dialog-desc'>
        <DialogHeader>
          <DialogTitle>{t('update_area_dialog.title')}</DialogTitle>
          <DialogDescription className='sr-only'>
            {t('update_area_dialog.description') || 'Dialog to update an existing area'}
          </DialogDescription>
        </DialogHeader>
        <div className='grid gap-4'>
          <div className='grid gap-3'>
            <Controller
              name='name'
              control={control}
              render={({ field }) => (
                <TextInput
                  type='text'
                  placeholder={t('create_area_dialog.name')}
                  className='h-9'
                  tabIndex={-1}
                  {...field}
                  value={t(field.value || '')}
                  {...(errors.name?.message && { errorMessage: t(errors.name.message) })}
                />
              )}
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
          <ConfirmDeleteAreaDialog area={area} onDeleteSuccess={handleDeleteSuccess} />
          <div className='flex gap-2'>
            <DialogClose asChild className='hover:bg-foreground/10 cursor-pointer'>
              <Button variant='outline'>{t('cancel')}</Button>
            </DialogClose>
            <LoaderButton
              className='h-auto cursor-pointer'
              disabled={!isValid || !isDirty}
              isLoading={updateMutation.isPending}
              onClick={onSubmit}
              label={t('save_changes')}
            />
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
