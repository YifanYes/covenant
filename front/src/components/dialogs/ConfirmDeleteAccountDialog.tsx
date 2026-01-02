import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog'
import { Button, buttonVariants } from '@/components/ui/button'
import { useAuthStore } from '@/hooks/use-auth-store'
import { cn } from '@/lib/utils'
import { trpc } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

export const ConfirmDeleteAccountDialog = () => {
  const { t } = useTranslation()
  const { signOut } = useAuthStore()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const deleteAccountMutation = useMutation(
    trpc.auth.deleteAccount.mutationOptions({
      onSuccess: async () => {
        await signOut()
        navigate('/sign-up')
        toast.success(t('confirm_delete_account_dialog.success'))
        setOpen(false)
      },
      onError: (error) => toast.error(t('confirm_delete_account_dialog.error'), { description: error.message })
    })
  )

  const handleDelete = () => deleteAccountMutation.mutate()

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant='destructive' disabled={deleteAccountMutation.isPending}>
          {t('confirm_delete_account_dialog.button')}
        </Button>
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirm_delete_account_dialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('confirm_delete_account_dialog.description')}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel className='hover:bg-foreground/10 cursor-pointer'>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'text-destructive hover:text-foreground hover:bg-foreground/10 cursor-pointer bg-transparent'
            )}
            onClick={handleDelete}
            disabled={deleteAccountMutation.isPending}
          >
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
