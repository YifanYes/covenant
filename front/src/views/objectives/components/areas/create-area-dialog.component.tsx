import BaseFormDialog from '@/common/base-form-dialog.component'
import ColorSelector from '@/forms/color-selector.component'
import IconPicker from '@/forms/icon-picker.component'
import TextInput from '@/forms/text-input.component'
import Button from '@/ui/button.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Plus } from '@nsmr/pixelart-react'
import { createAreaSchema, type CreateAreaBodyType } from '@shared/schemas/areas.schemas'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function CreateAreaDialog() {
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
    <BaseFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title='create_area_dialog.title'
      description='create_area_dialog.description'
      onSubmit={handleSubmit(onSubmit)}
      submitLabel='save_changes'
      isLoading={mutation.isPending}
      isSubmitDisabled={!isValid || !isDirty}
      trigger={
        <Button>
          <Plus />
          <span>{t('areas.add')}</span>
        </Button>
      }
    >
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
    </BaseFormDialog>
  )
}
