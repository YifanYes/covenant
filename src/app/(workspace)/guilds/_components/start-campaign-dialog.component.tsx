'use client'
import BaseFormDialog from '@/common/base-form-dialog.component'
import { rpgDialogContent } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import { CAMPAIGN_TEMPLATES } from '@/shared/constants/guild-campaigns.constants'
import Button from '@/ui/button.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { standardSchemaResolver } from '@hookform/resolvers/standard-schema'
import { startCampaignSchema, type StartCampaignType } from '@shared/schemas/guilds.schemas'
import { useMutation } from '@tanstack/react-query'
import { Flag } from 'pixelarticons/react'
import { type ReactNode, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

interface StartCampaignDialogProps {
  guildId: string
  trigger?: ReactNode
}

export default function StartCampaignDialog({ guildId, trigger }: StartCampaignDialogProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const activeKey = trpcOptions.guilds.getCurrentCampaign.queryKey({ guildId })
  const historyKey = trpcOptions.guilds.getCampaignHistory.queryKey({ guildId })

  const mutation = useMutation(
    trpcOptions.guilds.startCampaign.mutationOptions({
      onSuccess: () => {
        toast.success(t('guilds.campaigns.success.start'))
        queryClient.invalidateQueries({ queryKey: activeKey })
        queryClient.invalidateQueries({ queryKey: historyKey })
        setOpen(false)
      },
      onError: (error) => toast.error(t('guilds.campaigns.error.start'), { description: error.message })
    })
  )

  const defaultTemplateId = CAMPAIGN_TEMPLATES[0]?.id ?? ''

  const {
    control,
    handleSubmit,
    reset,
    formState: { isValid }
  } = useForm<StartCampaignType>({
    resolver: standardSchemaResolver(startCampaignSchema),
    mode: 'onSubmit',
    defaultValues: { guildId, templateId: defaultTemplateId }
  })

  const onSubmit = (data: StartCampaignType) => mutation.mutate(data)

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen)
    if (!isOpen) reset({ guildId, templateId: defaultTemplateId })
  }

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="guilds.campaigns.start.title"
      description="guilds.campaigns.start.description"
      onSubmit={handleSubmit(onSubmit)}
      submitLabel="guilds.campaigns.start.submit"
      isLoading={mutation.isPending}
      isSubmitDisabled={!isValid}
      className={rpgDialogContent}
      trigger={
        trigger || (
          <Button>
            <Flag className="h-4 w-4" />
            <span>{t('guilds.campaigns.start.cta')}</span>
          </Button>
        )
      }
    >
      <Controller
        name="templateId"
        control={control}
        render={({ field }) => (
          <div className="grid gap-2 max-h-[60vh] overflow-y-auto pr-1">
            {CAMPAIGN_TEMPLATES.map((tpl) => {
              const active = field.value === tpl.id
              return (
                <div
                  key={tpl.id}
                  role="button"
                  tabIndex={0}
                  aria-pressed={active}
                  onClick={() => field.onChange(tpl.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      field.onChange(tpl.id)
                    }
                  }}
                  className={cn(
                    'cursor-pointer text-left rounded-lg border-2 px-3 py-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60',
                    active ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-title text-sm">{t(tpl.nameKey)}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {t('guilds.campaigns.target', { count: tpl.defaultTarget })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{t(tpl.descriptionKey)}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span>{t('guilds.campaigns.duration', { count: tpl.durationDays })}</span>
                    <span>·</span>
                    <span>{t('guilds.campaigns.reward_gold', { gold: tpl.rewardPool.gold })}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      />
    </BaseFormDialog>
  )
}
