'use client'
import BaseFormDialog from '@/common/base-form-dialog.component'
import Input from '@/ui/input.component'
import Label from '@/ui/label.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface EditProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialName: string
}

export default function EditProfileDialog({ open, onOpenChange, initialName }: EditProfileDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState(initialName)
  const [wasOpen, setWasOpen] = useState(open)

  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) setName(initialName)
  }

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

  const trimmed = name.trim()
  const isUnchanged = trimmed === initialName
  const isEmpty = trimmed.length === 0
  const isSubmitDisabled = isUnchanged || isEmpty || updateProfileMutation.isPending

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title="user_menu.edit_name"
      onSubmit={() => updateProfileMutation.mutate({ characterName: trimmed })}
      submitLabel="save_changes"
      isLoading={updateProfileMutation.isPending}
      isSubmitDisabled={isSubmitDisabled}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-character-name">{t('settings.character_name_label')}</Label>
        <Input
          id="edit-character-name"
          maxLength={255}
          value={name}
          disabled={updateProfileMutation.isPending}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
    </BaseFormDialog>
  )
}
