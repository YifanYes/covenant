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
import { Button } from '@/components/ui/button'
import { useSnackbar } from '@/hooks/use-snackbar'
import type { Area } from '@/types/areas.types'
import { queryClient, trpc } from '@/utils/trpc'
import { useMutation } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

export function ConfirmDeleteAreaDialog({ area, onDeleteSuccess }: { area: Area; onDeleteSuccess: () => void }) {
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

  const handleDelete = () => {
    deleteMutation.mutate({ id: area.id })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          disabled={deleteMutation.isPending}
          className='mr-auto cursor-pointer border-red-500 text-red-500 hover:bg-red-500 hover:text-white'
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
          <AlertDialogCancel className='cursor-pointer'>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className='cursor-pointer bg-red-500 hover:bg-red-600'
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
