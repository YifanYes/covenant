'use client'
import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import type { Objective } from '@/types/models.types'
import Button from '@/ui/button.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { Trash } from '@nsmr/pixelart-react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface Props {
  objective: Objective
  onDeleteSuccess: () => void
}

export default function ConfirmDeleteObjectiveDialog({ objective, onDeleteSuccess }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const deleteMutation = useMutation(
    trpcOptions.objectives.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t('objectives.delete.success'))
        queryClient.invalidateQueries({ queryKey: trpcOptions.objectives.getAll.queryKey() })
        setOpen(false)
        onDeleteSuccess()
      },
      onError: (error) => toast.error(t('objectives.delete.error'), { description: error.message })
    })
  )

  const handleDelete = () => deleteMutation.mutate({ id: objective.id })

  return (
    <BaseConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title="objectives.delete.title"
      description="objectives.delete.description"
      onConfirm={handleDelete}
      confirmLabel="delete"
      isLoading={deleteMutation.isPending}
      trigger={
        <Button
          variant="outline"
          disabled={deleteMutation.isPending}
          className="text-destructive hover:text-foreground hover:bg-foreground/10"
        >
          <Trash className="h-4 w-4" />
          {t('delete')}
        </Button>
      }
    />
  )
}
