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
import type { Habit } from '@/types/models.types'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export const ConfirmDeleteHabitDialog = ({ habit, onDeleteSuccess }: { habit: Habit; onDeleteSuccess: () => void }) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const deleteMutation = useMutation(
    trpc.habits.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t('habits.success.delete'))
        queryClient.invalidateQueries({ queryKey: trpc.habits.getAll.queryKey() })
        setOpen(false)
        onDeleteSuccess()
      },
      onError: (error) => toast.error(t('habits.error.internal.delete'), { description: error.message })
    })
  )

  const handleDelete = () => deleteMutation.mutate({ id: habit.id })

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
          <AlertDialogTitle>{t('confirm_delete_habit_dialog.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('confirm_delete_habit_dialog.description')}</AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel className='hover:bg-foreground/10 cursor-pointer'>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction
            className='text-destructive hover:text-foreground hover:bg-foreground/10 cursor-pointer bg-transparent'
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
