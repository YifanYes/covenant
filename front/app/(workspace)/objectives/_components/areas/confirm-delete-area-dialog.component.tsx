'use client'
import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import type { Area } from '@/types/models.types'
import Button from '@/ui/button.component'
import { queryClient, trpc, trpcOptions } from '@/utils/trpc.utils'
import { Trash } from '@nsmr/pixelart-react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface Props {
  area: Area
  onDeleteSuccess: () => void
}

export default function ConfirmDeleteAreaDialog({ area, onDeleteSuccess }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const deleteMutation = useMutation(
    trpcOptions.areas.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t('areas.success.delete'))
        queryClient.invalidateQueries({ queryKey: trpcOptions.areas.getAll.queryKey() })
        setOpen(false)
        onDeleteSuccess()
      },
      onError: (error) => toast.error(t('areas.error.internal.delete'), { description: error.message })
    })
  )

  const handleDelete = () => deleteMutation.mutate({ id: area.id })

  return (
    <BaseConfirmDialog
      open={open}
      onOpenChange={setOpen}
      title='confirm_delete_area_dialog.title'
      description='confirm_delete_area_dialog.description'
      onConfirm={handleDelete}
      confirmLabel='delete'
      isLoading={deleteMutation.isPending}
      trigger={
        <Button
          variant='outline'
          disabled={deleteMutation.isPending}
          className='text-destructive hover:text-foreground hover:bg-foreground/10 mr-auto'
        >
          <Trash className='mr-2 h-4 w-4' />
          {t('delete')}
        </Button>
      }
    />
  )
}
