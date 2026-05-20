'use client'
import BaseFormDialog from '@/common/base-form-dialog.component'
import { rpgDialogContent } from '@/components/rpg/rpg-styles'
import TextInput from '@/forms/text-input.component'
import Button from '@/ui/button.component'
import TiptapEditor from '@/ui/tiptap-editor.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { GUILD_DESCRIPTION_HTML_MAX_LENGTH, GUILD_DESCRIPTION_MAX_LENGTH } from '@shared/constants/guild.constants'
import { createGuildSchema, type CreateGuildType } from '@shared/schemas/guilds.schemas'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Plus } from 'pixelarticons/react'
import { useState, type ReactNode } from 'react'
import { Controller, useForm } from 'react-hook-form'
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
    control,
    watch,
    formState: { errors, isValid, isDirty }
  } = useForm<CreateGuildType>({
    resolver: standardSchemaResolver(createGuildSchema),
    mode: 'onSubmit',
    defaultValues: { name: '', description: '' }
  })

  const descriptionHtml = watch('description') ?? ''
  const descriptionPlainLength = descriptionHtml.replace(/<[^>]*>/g, '').trim().length
  const descriptionHtmlLength = descriptionHtml.trim().length
  const descriptionPlainOver = descriptionPlainLength > GUILD_DESCRIPTION_MAX_LENGTH
  const descriptionHtmlOver = descriptionHtmlLength > GUILD_DESCRIPTION_HTML_MAX_LENGTH
  const descriptionOverLimit = descriptionPlainOver || descriptionHtmlOver

  const onSubmit = (data: CreateGuildType) => {
    const trimmed = (data.description ?? '').replace(/<[^>]*>/g, '').trim()
    const description = trimmed.length > 0 ? data.description : undefined
    mutation.mutate({ name: data.name, description })
  }

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
      isSubmitDisabled={!isValid || !isDirty || descriptionOverLimit}
      className={rpgDialogContent}
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
        <div className="space-y-1">
          <Controller
            control={control}
            name="description"
            render={({ field }) => (
              <TiptapEditor
                content={field.value ?? ''}
                onChange={field.onChange}
                placeholder={t('guilds.create.description_placeholder')}
                className="min-h-32"
              />
            )}
          />
          <p
            className={
              descriptionOverLimit
                ? 'text-destructive text-xs tabular-nums text-right'
                : 'text-muted-foreground text-xs tabular-nums text-right'
            }
          >
            {t('guilds.description.char_count', {
              count: descriptionPlainLength,
              max: GUILD_DESCRIPTION_MAX_LENGTH
            })}
          </p>
          {(descriptionOverLimit || errors.description?.message) && (
            <p className="text-destructive text-xs">
              {descriptionOverLimit ? t('guilds.description.too_long') : errors.description?.message?.toString()}
            </p>
          )}
        </div>
      </div>
    </BaseFormDialog>
  )
}
