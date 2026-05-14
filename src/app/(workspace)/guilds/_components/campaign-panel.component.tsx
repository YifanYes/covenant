'use client'
import LoaderButton from '@/common/loader-button.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import { Badge } from '@/ui/badge.component'
import { Progress } from '@/ui/progress.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { getCampaignTemplate } from '@shared/constants/guild-campaigns'
import { GuildRole, type GuildRoleType } from '@shared/schemas/guilds.schemas'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Coins, Flag, Trophy } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import StartCampaignDialog from './start-campaign-dialog.component'

interface CampaignPanelProps {
  guildId: string
  myUserId: string
  myRole: GuildRoleType
  members: Array<{ userId: string; user: { id: string; name: string | null; character: { name: string } | null } }>
}

function formatRemaining(expiresAt: Date, t: ReturnType<typeof useTranslation>['t']) {
  const diff = expiresAt.getTime() - Date.now()
  if (diff <= 0) return t('guilds.campaigns.expired')
  const days = Math.floor(diff / 86_400_000)
  if (days >= 1) return t('guilds.campaigns.remaining_days', { count: days })
  const hours = Math.floor(diff / 3_600_000)
  if (hours >= 1) return t('guilds.campaigns.remaining_hours', { count: hours })
  const mins = Math.max(1, Math.floor(diff / 60_000))
  return t('guilds.campaigns.remaining_minutes', { count: mins })
}

export default function CampaignPanel({ guildId, myUserId, myRole, members }: CampaignPanelProps) {
  const { t } = useTranslation()

  const activeQuery = useQuery({
    ...trpcOptions.guilds.getCurrentCampaign.queryOptions({ guildId }),
    refetchInterval: 7000,
    refetchIntervalInBackground: false
  })
  const historyQuery = useQuery(trpcOptions.guilds.getCampaignHistory.queryOptions({ guildId }))

  const claimMutation = useMutation(
    trpcOptions.guilds.claimCampaignReward.mutationOptions({
      onSuccess: async (result) => {
        toast.success(t('guilds.campaigns.success.claim', { gold: result.goldClaimed }))
        await queryClient.invalidateQueries({
          queryKey: trpcOptions.guilds.getCurrentCampaign.queryKey({ guildId })
        })
        await queryClient.invalidateQueries({
          queryKey: trpcOptions.guilds.getCampaignHistory.queryKey({ guildId })
        })
        await queryClient.invalidateQueries({ queryKey: trpcOptions.character.get.queryKey() })
      },
      onError: (error) => toast.error(t('guilds.campaigns.error.claim'), { description: error.message })
    })
  )

  const canManage = myRole === GuildRole.OWNER || myRole === GuildRole.OFFICER
  const campaign = activeQuery.data

  if (activeQuery.isLoading) {
    return (
      <div className={cn(panelChrome, 'p-4 animate-pulse')}>
        <div className="h-4 w-1/3 rounded bg-muted/30 mb-2" />
        <div className="h-3 w-2/3 rounded bg-muted/20" />
      </div>
    )
  }

  const otherHistory = (historyQuery.data ?? []).filter((c) => c.id !== campaign?.id)

  if (!campaign) {
    return (
      <div className={cn(panelChrome, 'p-5 space-y-3')}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Flag className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div>
              <h3 className="font-title text-base">{t('guilds.campaigns.empty.title')}</h3>
              <p className="text-muted-foreground text-xs mt-0.5 max-w-md">
                {t('guilds.campaigns.empty.description')}
              </p>
            </div>
          </div>
          {canManage && <StartCampaignDialog guildId={guildId} />}
        </div>
        {otherHistory.length > 0 && <HistoryList history={otherHistory} t={t} />}
      </div>
    )
  }

  const template = getCampaignTemplate(campaign.templateId)
  const pct = Math.min(100, Math.round((campaign.progress / Math.max(1, campaign.target)) * 100))
  const isCompleted = campaign.completedAt != null
  const isExpired = campaign.isExpired && !isCompleted
  const myContribution = campaign.myContribution
  const canClaim =
    isCompleted &&
    myContribution > 0 &&
    !campaign.myClaimedAt &&
    campaign.myShare > 0

  return (
    <div className={cn(panelChrome, 'p-5 space-y-4')}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <Flag className={cn('h-5 w-5 shrink-0 mt-0.5', isCompleted ? 'text-emerald-400' : 'text-accent')} />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-title text-base truncate">
                {template ? t(template.nameKey) : campaign.templateId}
              </h3>
              {isCompleted && (
                <Badge variant="default" className="gap-1">
                  <Trophy className="h-3 w-3" />
                  {t('guilds.campaigns.completed')}
                </Badge>
              )}
              {isExpired && (
                <Badge variant="outline" className="text-destructive border-destructive/50">
                  {t('guilds.campaigns.expired')}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground text-xs mt-0.5">
              {template ? t(template.descriptionKey) : null}
            </p>
            <p className="text-muted-foreground text-[11px] mt-1">
              {isCompleted
                ? t('guilds.campaigns.contributors', { count: campaign.contributorCount ?? 0 })
                : formatRemaining(new Date(campaign.expiresAt), t)}
            </p>
          </div>
        </div>
        {canClaim && (
          <LoaderButton
            isLoading={claimMutation.isPending}
            onClick={() => claimMutation.mutate({ campaignId: campaign.id })}
            icon={<Coins className="h-4 w-4" />}
            label={t('guilds.campaigns.claim_cta', { gold: campaign.myShare })}
          />
        )}
        {isCompleted && campaign.myClaimedAt && (
          <Badge variant="outline" className="gap-1">
            <Coins className="h-3 w-3" />
            {t('guilds.campaigns.claimed')}
          </Badge>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="tabular-nums">
            {campaign.progress} / {campaign.target}
          </span>
          <span className="tabular-nums">
            {t('guilds.campaigns.reward_gold', { gold: campaign.rewardPool.gold })}
          </span>
        </div>
        <Progress value={pct} className="h-2" />
      </div>

      {campaign.leaderboard.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {t('guilds.campaigns.leaderboard')}
          </h4>
          <ol className="space-y-1">
            {campaign.leaderboard.map((entry, idx) => {
              const member = members.find((m) => m.userId === entry.userId)
              const name = member?.user.character?.name || member?.user.name || t('guilds.forum.unknown_user')
              const isMe = entry.userId === myUserId
              return (
                <li
                  key={entry.userId}
                  className={cn(
                    'flex items-center justify-between gap-3 px-2 py-1 rounded text-xs',
                    isMe && 'bg-accent/10'
                  )}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="text-muted-foreground tabular-nums w-5 text-right">{idx + 1}.</span>
                    <span className="truncate">
                      {name}
                      {isMe && <span className="text-muted-foreground ml-1">{t('guilds.member.you')}</span>}
                    </span>
                  </span>
                  <span className="tabular-nums shrink-0">{entry.contribution}</span>
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {!isCompleted && myContribution === 0 && (
        <p className="text-[11px] text-muted-foreground">{t('guilds.campaigns.no_contribution')}</p>
      )}

      {isCompleted && canManage && (
        <div className="pt-2 border-t">
          <StartCampaignDialog guildId={guildId} />
        </div>
      )}

      {otherHistory.length > 0 && <HistoryList history={otherHistory} t={t} />}
    </div>
  )
}

interface CampaignHistoryItem {
  id: string
  templateId: string
  target: number
  progress: number
  completedAt: Date | string | null
}

function HistoryList({
  history,
  t
}: {
  history: CampaignHistoryItem[]
  t: ReturnType<typeof useTranslation>['t']
}) {
  return (
    <div className="border-t pt-3 space-y-1.5">
      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {t('guilds.campaigns.history')}
      </h4>
      <ul className="space-y-1">
        {history.slice(0, 5).map((c) => {
          const tpl = getCampaignTemplate(c.templateId)
          return (
            <li key={c.id} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="truncate">{tpl ? t(tpl.nameKey) : c.templateId}</span>
              <span className="tabular-nums">
                {c.progress} / {c.target}
                {c.completedAt ? ` · ${t('guilds.campaigns.completed')}` : ''}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
