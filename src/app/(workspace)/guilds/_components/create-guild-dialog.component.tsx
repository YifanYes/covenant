'use client'
import BaseFormDialog from '@/common/base-form-dialog.component'
import TextInput from '@/forms/text-input.component'
import Button from '@/ui/button.component'
import Textarea from '@/ui/textarea.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { createGuildSchema, type CreateGuildType } from '@shared/schemas/guilds.schemas'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Plus } from 'pixelarticons/react'
import { useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface CreateGuildDialogProps {
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function CreateGuildDialog({ trigger, open: controlledOpen, onOpenChange }: CreateGuildDialogProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const [internalOpen, setInternalOpen] = useState(false)
  const isControlled = controlledOpen !== undefined
  const open = isControlled ? controlledOpen : internalOpen
  const setOpen = isControlled ? (onOpenChange ?? (() => {})) : setInternalOpen

  const mutation = useMutation(
    trpcOptions.guilds.create.mutationOptions({
      onSuccess: async (guild) => {
        toast.success(t('guilds.success.create'))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.guilds.getMyGuild.queryKey() })
        setOpen(false)
        router.push(`/guilds/${guild.id}`)
      },
      onError: (error) => toast.error(t('guilds.error.create'), { description: error.message })
    })
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<CreateGuildType>({
    resolver: standardSchemaResolver(createGuildSchema),
    mode: 'onSubmit',
    defaultValues: { name: '', description: '' }
  })

  const onSubmit = (data: CreateGuildType) => mutation.mutate(data)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) reset()
  }

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="guilds.create.title"
      description="guilds.create.description"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="guilds.create.submit"
      isLoading={mutation.isPending}
      isSubmitDisabled={!isValid || !isDirty}
      trigger={
        trigger || (
          <Button>
            <Plus />
            <span>{t('guilds.create.cta')}</span>
          </Button>
        )
      }
    >
      <div className="grid gap-4">
        <TextInput
          type="text"
          label={t('guilds.create.name_label')}
          placeholder={t('guilds.create.name_placeholder')}
          className="h-9"
          {...register('name')}
          {...(errors.name?.message && { errorMessage: errors.name.message.toString() })}
          required
        />
        <Textarea
          placeholder={t('guilds.create.description_placeholder')}
          className="min-h-20 resize-none"
          {...register('description')}
        />
      </div>
    </BaseFormDialog>
  )
}
