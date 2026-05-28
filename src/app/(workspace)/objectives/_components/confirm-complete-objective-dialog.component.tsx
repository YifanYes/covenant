'use client'
import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import type { Objective } from '@/types/models.types'
import Button from '@/ui/button.component'
import { invalidators } from '@/utils/query-invalidation.utils'
import { getRewardText } from '@/utils/text.utils'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { Check } from 'pixelarticons/react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface Props {
  objective: Objective
  onCompleteSuccess: () => void
}

export default function ConfirmCompleteObjectiveDialog({ objective, onCompleteSuccess }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const completeMutation = useMutation(
    trpcOptions.objectives.complete.mutationOptions({
      onSuccess: async (data) => {
        toast.success(t('objectives.complete.success', { manaReward: getRewardText(data.manaEarned, data.reserveGained, t('combat.mana_reserve')) }))
        await queryClient.invalidateQueries({ queryKey: trpcOptions.objectives.getAll.queryKey() })
        await invalidators.character()
        setOpen(false)
        onCompleteSuccess()
      },
      onError: (error) => toast.error(t('objectives.complete.error'), { description: error.message })
    })
  )

  const handleComplete = () => completeMutation.mutate({ publicId: objective.publicId })

  return (
    <BaseConfirmDialog
      open={open}
      onOpenChange={setOpen}
      titleKey="objectives.complete.title"
      descriptionKey="objectives.complete.description"
      onConfirm={handleComplete}
      confirmLabelKey="objectives.complete.button"
      confirmClassName="hover:bg-foreground/10 bg-transparent text-green-400 hover:text-green-400 cursor-pointer"
      isLoading={completeMutation.isPending}
      trigger={
        <Button
          variant="outline"
          disabled={completeMutation.isPending}
          className="hover:text-foreground hover:bg-foreground/10 mr-auto text-green-400"
        >
          <Check className="h-4 w-4" />
          {t('objectives.complete.button')}
        </Button>
      }
    />
  )
}
