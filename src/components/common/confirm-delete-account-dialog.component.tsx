'use client'
import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import { useAuthStore } from '@/stores/auth.store'
import { trpcOptions } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface ConfirmDeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ConfirmDeleteAccountDialog = ({ open, onOpenChange }: ConfirmDeleteAccountDialogProps) => {
  const { t } = useTranslation()
  const { signOut } = useAuthStore()

  const deleteAccountMutation = useMutation(
    trpcOptions.auth.deleteAccount.mutationOptions({
      onSuccess: async () => {
        await signOut()
        toast.success(t('confirm_delete_account_dialog.success'))
        onOpenChange(false)
        // Hard nav clears the in-memory session atom + RQ cache so the destination
        // page doesn't see a stale logged-in session and bounce back to a protected route.
        window.location.assign('/sign-up')
      },
      onError: (error) => toast.error(t('confirm_delete_account_dialog.error'), { description: error.message })
    })
  )

  return (
    <BaseConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      titleKey="confirm_delete_account_dialog.title"
      descriptionKey="confirm_delete_account_dialog.description"
      onConfirm={() => deleteAccountMutation.mutate()}
      confirmLabelKey="delete"
      isLoading={deleteAccountMutation.isPending}
    />
  )
}
