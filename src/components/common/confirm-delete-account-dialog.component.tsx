'use client'
import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import { useAuthStore } from '@/stores/auth.store'
import { trpcOptions } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface ConfirmDeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const ConfirmDeleteAccountDialog = ({ open, onOpenChange }: ConfirmDeleteAccountDialogProps) => {
  const { t } = useTranslation()
  const { signOut } = useAuthStore()
  const router = useRouter()

  const deleteAccountMutation = useMutation(
    trpcOptions.auth.deleteAccount.mutationOptions({
      onSuccess: async () => {
        await signOut()
        router.push('/sign-up')
        toast.success(t('confirm_delete_account_dialog.success'))
        onOpenChange(false)
      },
      onError: (error) => toast.error(t('confirm_delete_account_dialog.error'), { description: error.message })
    })
  )

  return (
    <BaseConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="confirm_delete_account_dialog.title"
      description="confirm_delete_account_dialog.description"
      onConfirm={() => deleteAccountMutation.mutate()}
      confirmLabel="delete"
      isLoading={deleteAccountMutation.isPending}
    />
  )
}
