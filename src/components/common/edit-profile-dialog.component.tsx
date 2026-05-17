'use client'
import BaseFormDialog from '@/common/base-form-dialog.component'
import TextInput from '@/forms/text-input.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { updateProfileSchema, type UpdateProfileType } from '@shared/schemas/auth.schemas'
import { useMutation } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName: string
}

export default function EditProfileDialog({ open, onOpenChange, initialName }: EditProfileDialogProps) {
  const { t } = useTranslation()

  const updateProfileMutation = useMutation(
    trpcOptions.auth.updateProfile.mutationOptions({
      onSuccess: async () => {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: trpcOptions.auth.getProfile.queryKey() }),
          queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
        ])
        toast.success(t('settings.character_name_updated'))
        onOpenChange(false)
      },
      onError: () => toast.error(t('settings.character_name_error'))
    })
  )

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isDirty }
  } = useForm<UpdateProfileType>({
    resolver: standardSchemaResolver(updateProfileSchema),
    mode: 'onSubmit',
    defaultValues: { characterName: initialName }
  })

  useEffect(() => {
    if (open) reset({ characterName: initialName })
  }, [open, initialName, reset])

  const onSubmit = (data: UpdateProfileType) =>
    updateProfileMutation.mutate({ characterName: data.characterName?.trim() })

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="user_menu.edit_name"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="save_changes"
      isLoading={updateProfileMutation.isPending}
      isSubmitDisabled={!isValid || !isDirty}
    >
      <TextInput
        type="text"
        label={t('settings.character_name_label')}
        maxLength={255}
        disabled={updateProfileMutation.isPending}
        {...register('characterName')}
        {...(errors.characterName?.message && {
          errorMessage: t(errors.characterName.message.toString())
        })}
      />
    </BaseFormDialog>
  )
}
