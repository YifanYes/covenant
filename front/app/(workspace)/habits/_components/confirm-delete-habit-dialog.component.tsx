'use client'
import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import type { Habit } from '@/types/models.types'
import Button from '@/ui/button.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { Trash } from '@nsmr/pixelart-react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function ConfirmDeleteHabitDialog({
  habit,
  onDeleteSuccess
}: {
  habit: Habit
  onDeleteSuccess: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const deleteMutation = useMutation(
    trpcOptions.habits.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t('habits.success.delete'))
        queryClient.invalidateQueries({ queryKey: trpcOptions.habits.getAll.queryKey() })
        setOpen(false)
        onDeleteSuccess()
      },
      onError: (error) => toast.error(t('habits.error.internal.delete'), { description: error.message })
    })
  )

  const handleDelete = () => deleteMutation.mutate({ id: habit.id })

  return (
    <BaseConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="confirm_delete_habit_dialog.title"
      description="confirm_delete_habit_dialog.description"
      onConfirm={handleDelete}
      confirmLabel="delete"
      isLoading={deleteMutation.isPending}
      trigger={
        <Button
          variant="outline"
          disabled={deleteMutation.isPending}
          className="text-destructive hover:text-foreground hover:bg-foreground/10 mr-auto"
        >
          <Trash className="mr-2 h-4 w-4" />
          {t('delete')}
        </Button>
      }
    />
  )
}
