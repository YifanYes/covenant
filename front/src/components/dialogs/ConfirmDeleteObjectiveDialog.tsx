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
import type { Objective } from '@/types/models.types'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { Trash } from '@nsmr/pixelart-react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import LoaderButton from '../LoaderButton'

interface Props {
  objective: Objective
  onDeleteSuccess: () => void
}

export const ConfirmDeleteObjectiveDialog = ({ objective, onDeleteSuccess }: Props) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const deleteMutation = useMutation(
    trpc.objectives.delete.mutationOptions({
      onSuccess: () => {
        toast.success(t('objectives.delete.success'))
        queryClient.invalidateQueries({ queryKey: trpc.objectives.getAll.queryKey() })
        setOpen(false)
        onDeleteSuccess()
      },
      onError: (error) => toast.error(t('objectives.delete.error'), { description: error.message })
    })
  )

  const handleDelete = () => deleteMutation.mutate({ id: objective.id })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          disabled={deleteMutation.isPending}
          className='text-destructive hover:text-foreground hover:bg-foreground/10 mr-auto h-auto'
        >
          <Trash className='mr-2 h-4 w-4' />
          {t('delete')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('objectives.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('objectives.delete.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='hover:bg-foreground/10 cursor-pointer'>{t('cancel')}</AlertDialogCancel>

          <AlertDialogAction asChild>
            <LoaderButton
              className='text-destructive hover:text-foreground hover:bg-foreground/10 bg-transparent'
              disabled={deleteMutation.isPending}
              isLoading={deleteMutation.isPending}
              label={t('delete')}
              onClick={handleDelete}
            />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
