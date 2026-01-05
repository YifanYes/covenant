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
import { Check } from '@nsmr/pixelart-react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import LoaderButton from '../LoaderButton'

interface Props {
  objective: Objective
  onCompleteSuccess: () => void
}

export const ConfirmCompleteObjectiveDialog = ({ objective, onCompleteSuccess }: Props) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const completeMutation = useMutation(
    trpc.objectives.complete.mutationOptions({
      onSuccess: (data) => {
        const rewardMsg = data.diceEarned > 0 ? ` (+${data.diceEarned} 🎲)` : ''
        toast.success(t('objectives.complete.success') + rewardMsg)
        queryClient.invalidateQueries({ queryKey: trpc.objectives.getAll.queryKey() })
        setOpen(false)
        onCompleteSuccess()
      },
      onError: (error) => toast.error(t('objectives.complete.error'), { description: error.message })
    })
  )

  const handleComplete = () => completeMutation.mutate({ id: objective.id })

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant='outline'
          size='sm'
          disabled={completeMutation.isPending}
          className='hover:text-foreground hover:bg-foreground/10 mr-auto h-auto text-green-400'
        >
          <Check className='h-4 w-4' />
          {t('objectives.complete.button')}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('objectives.complete.title')}</AlertDialogTitle>
          <AlertDialogDescription>{t('objectives.complete.description')}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className='hover:bg-foreground/10 cursor-pointer'>{t('cancel')}</AlertDialogCancel>
          <AlertDialogAction asChild>
            <LoaderButton
              className='hover:bg-foreground/10 bg-transparent text-green-400 hover:text-green-400'
              disabled={completeMutation.isPending}
              isLoading={completeMutation.isPending}
              label={t('objectives.complete.button')}
              onClick={handleComplete}
            />
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
