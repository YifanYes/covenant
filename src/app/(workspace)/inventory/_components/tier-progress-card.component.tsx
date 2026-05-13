'use client'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { Progress } from '@/components/ui/progress.component'
import { cn } from '@/lib/cn.lib'
import { trpcOptions } from '@/utils/trpc.utils'
import { Shield, Trophy } from 'pixelarticons/react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function TierProgressCard() {
  const { t } = useTranslation()
  const { data: tierProgress, isLoading } = useQuery(trpcOptions.killRecord.getTierProgress.queryOptions())

  if (isLoading) {
    return (
      <div className={cn(panelChrome, 'animate-pulse p-4')}>
        <div className="bg-muted h-6 w-32 rounded" />
        <div className="bg-muted mt-4 h-4 w-full rounded-full" />
      </div>
    )
  }

  if (!tierProgress) return null

  const { currentTier, progress } = tierProgress
  const isMaxTier = !progress

  return (
    <div className={cn(panelChrome, 'p-4')}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span className="font-semibold">{t('tier_progress.title')}</span>
        </div>
        <div
          className={cn(
            'rounded-md px-2 py-1 text-sm font-bold',
            currentTier === 1 && 'bg-zinc-700 text-zinc-300',
            currentTier === 2 && 'bg-blue-900 text-blue-300',
            currentTier === 3 && 'bg-purple-900 text-purple-300'
          )}
        >
          {t('tier_progress.tier_label', { tier: currentTier })}
        </div>
      </div>

      {isMaxTier ? (
        <div className="text-muted-foreground mt-4 flex items-center justify-center gap-2 text-sm">
          <Shield className="h-4 w-4" />
          <span>{t('tier_progress.max_tier_reached')}</span>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {t('tier_progress.kills_progress', {
                current: progress.currentKills,
                required: progress.requiredKills
              })}
            </span>
            <span className="font-medium">{t('tier_progress.tier_label', { tier: progress.nextTier })}</span>
          </div>
          <Progress
            value={progress.percentage}
            className="h-2"
            indicatorClassName={cn(
              progress.nextTier === 2 && 'bg-blue-500',
              progress.nextTier === 3 && 'bg-purple-500'
            )}
          />
          <div className="text-muted-foreground text-right text-xs">{progress.percentage}%</div>
        </div>
      )}
    </div>
  )
}
