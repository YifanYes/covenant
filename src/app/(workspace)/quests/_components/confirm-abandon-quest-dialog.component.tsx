'use client'

import BaseConfirmDialog from '@/common/base-confirm-dialog.component'
import Button from '@/ui/button.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function ConfirmAbandonQuestDialog({
  questId,
  onAbandonSuccess
}: {
  questId: string
  onAbandonSuccess: () => void
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const abandonMutation = useMutation(
    trpcOptions.quest.abandon.mutationOptions({
      onSuccess: () => {
        toast.success(t('quests.abandon.success'))
        queryClient.invalidateQueries({ queryKey: trpcOptions.quest.list.queryKey() })
        queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
        setOpen(false)
        onAbandonSuccess()
      },
      onError: (error) => toast.error(t('quests.error.abandon'), { description: error.message })
    })
  )

  const handleAbandon = () => abandonMutation.mutate({ questId })

  return (
    <BaseConfirmDialog
      open={open}
      onOpenChange={setOpen}
      titleKey="quests.abandon.confirm_title"
      descriptionKey="quests.abandon.confirm_description"
      onConfirm={handleAbandon}
      confirmLabelKey="quests.abandon.confirm_cta"
      isLoading={abandonMutation.isPending}
      trigger={
        <Button
          variant="outline"
          disabled={abandonMutation.isPending}
          className="text-destructive hover:text-foreground hover:bg-foreground/10 mr-auto"
        >
          {t('quests.abandon.button')}
        </Button>
      }
    />
  )
}
