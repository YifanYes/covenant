import { BaseFormDialog } from '@/common'
import { DatePicker, MultiSelect, TextInput } from '@/forms'
import { Button, Textarea } from '@/ui'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { Plus } from '@nsmr/pixelart-react'
import { createObjectiveSchema, type CreateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function CreateObjectiveDialog() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const { data: areasData } = useSuspenseQuery(trpc.areas.getAll.queryOptions())

  const mutation = useMutation(
    trpc.objectives.create.mutationOptions({
      onSuccess: () => {
        toast.success(t('create_objective_dialog.success'))
        queryClient.invalidateQueries({ queryKey: trpc.objectives.getAll.queryKey() })
        setOpen(false)
      },
      onError: (error) => {
        console.error(error)
        toast.error(t('create_objective_dialog.error.internal'))
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
    resolver: standardSchemaResolver(createObjectiveSchema),
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
    <BaseFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title='create_objective_dialog.title'
      description='create_objective_dialog.description'
      onSubmit={handleSubmit(onSubmit)}
      submitLabel='save_changes'
      isLoading={mutation.isPending}
      isSubmitDisabled={!isValid || !isDirty}
      className='sm:max-w-[500px]'
      trigger={
        <Button>
          <Plus />
          <span>{t('objectives.add')}</span>
        </Button>
      }
    >
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
    </BaseFormDialog>
  )
}
