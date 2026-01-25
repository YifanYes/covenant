'use client'
import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import { useAuthStore } from '@/stores/auth.store'
import Button from '@/ui/button.component'
import { trpc } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export const ConfirmDeleteAccountDialog = () => {
  const { t } = useTranslation()
  const { signOut } = useAuthStore()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const deleteAccountMutation = useMutation(
    trpc.auth.deleteAccount.mutationOptions({
      onSuccess: async () => {
        await signOut()
        router.push('/sign-up')
        toast.success(t('confirm_delete_account_dialog.success'))
        setOpen(false)
      },
      onError: (error) => toast.error(t('confirm_delete_account_dialog.error'), { description: error.message })
    })
  )

  const handleDelete = () => deleteAccountMutation.mutate()

  return (
    <BaseConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title='confirm_delete_account_dialog.title'
      description='confirm_delete_account_dialog.description'
      onConfirm={handleDelete}
      confirmLabel='delete'
      isLoading={deleteAccountMutation.isPending}
      trigger={
        <Button variant='destructive' disabled={deleteAccountMutation.isPending}>
          {t('confirm_delete_account_dialog.button')}
        </Button>
      }
    />
  )
}
