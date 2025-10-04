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
import { useSnackbar } from '@/hooks/use-snackbar'
import { cn } from '@/lib/utils'
import type { Area } from '@/types/models.types'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface Props {
  area: Area
  onDeleteSuccess: () => void
}

export const ConfirmDeleteAreaDialog = ({ area, onDeleteSuccess }: Props) => {
  const { t } = useTranslation()
  const { show } = useSnackbar()
  const [open, setOpen] = useState(false)

  const deleteMutation = useMutation(
    trpc.areas.delete.mutationOptions({
      onSuccess: () => {
        show({ variant: 'success', title: t('areas.success.delete') })
        queryClient.invalidateQueries({ queryKey: trpc.areas.getAll.queryKey() })
        setOpen(false)
        onDeleteSuccess()
      },
      onError: (error) => {
        console.log(error)
        show({
          variant: 'destructive',
          title: t('areas.error.internal.delete')
        })
      }
    })
  )

  const handleDelete = () => deleteMutation.mutate({ id: area.id })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          disabled={deleteMutation.isPending}
          className='text-destructive hover:text-foreground hover:bg-foreground/10 mr-auto h-auto'
        >
          <Trash2 className='mr-2 h-4 w-4' />
          {t('delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('confirm_delete_area_dialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('confirm_delete_area_dialog.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='hover:bg-foreground/10 cursor-pointer'>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'text-destructive hover:text-foreground hover:bg-foreground/10 cursor-pointer bg-transparent'
            )}
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {t('delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
