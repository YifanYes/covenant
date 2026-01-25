import BaseFormDialog from '@/common/base-form-dialog.component'
import ColorSelector from '@/forms/color-selector.component'
import IconPicker from '@/forms/icon-picker.component'
import TextInput from '@/forms/text-input.component'
import { areaStyles } from '@/types/colors.types'
import { allIcons } from '@/types/icons.types'
import type { Area } from '@/types/models.types'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { defaultAreas, updateAreaSchema, type UpdateAreaBodyType } from '@shared/schemas/areas.schemas'
import { useMutation } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import ConfirmDeleteAreaDialog from './confirm-delete-area-dialog.component'

export default function UpdateAreaDialog({ area }: { area: Area }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const areaStyle = areaStyles.find((defaultArea) => defaultArea.color === area.color)
  const currentIcon = allIcons.find((icon) => icon.name === area.icon)

  const updateMutation = useMutation(
    trpc.areas.update.mutationOptions({
      onSuccess: () => {
        toast.success(t('areas.success.create'))
        queryClient.invalidateQueries({ queryKey: trpc.areas.getAll.queryKey() })
        setOpen(false)
      },
      onError: (error) => toast.error(t('areas.error.internal.update'), { description: error.message })
    })
  )

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<UpdateAreaBodyType>({
    resolver: standardSchemaResolver(updateAreaSchema),
    mode: 'onSubmit',
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

  const onSubmit = (data: UpdateAreaBodyType) => updateMutation.mutate(data)

  const handleDeleteSuccess = () => setOpen(false)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    reset()
  }

  const isDefaultArea = defaultAreas.some((defaultArea) => defaultArea.name === area.name)

  const Badge = areaStyle ? (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors duration-200 ${
        areaStyle.styles
      } ${!isDefaultArea ? 'cursor-pointer hover:brightness-110' : ''}`}
    >
      {currentIcon && <currentIcon.component className='size-4' />}
      <span>{t(area.name)}</span>
    </div>
  ) : null

  if (!Badge) {
    return null
  }

  if (isDefaultArea) {
    return Badge
  }

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title='update_area_dialog.title'
      description='update_area_dialog.description'
      onSubmit={handleSubmit(onSubmit)}
      submitLabel='save_changes'
      isLoading={updateMutation.isPending}
      isSubmitDisabled={!isValid || !isDirty}
      extraFooterActions={<ConfirmDeleteAreaDialog area={area} onDeleteSuccess={handleDeleteSuccess} />}
      trigger={Badge}
    >
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
                required
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
    </BaseFormDialog>
  )
}
