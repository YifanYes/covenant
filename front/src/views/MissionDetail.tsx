import TierBadge from '@/components/adventure/TierBadge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/utils/trpc.utils'
import { ChevronLeft } from '@nsmr/pixelart-react'
import { getEnemy } from '@shared/constants/enemies'
import { getMission } from '@shared/constants/missions'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

export default function MissionDetail() {
  const { t } = useTranslation()
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: characterData } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())
  const { data: activeMission } = useSuspenseQuery(trpc.missions.getActive.queryOptions())

  const mission = getMission(missionId || '')
  const isActive = activeMission?.mission?.name === missionId
  const hasActiveMission = !!activeMission?.mission

  const startMutation = useMutation({
    ...trpc.missions.start.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.missions.getActive.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.missions.list.queryKey() })
      toast.success(t('missions.success.start'))
    },
    onError: (error) => toast.error(t('missions.error.internal.start'), { description: error.message })
  })

  const abandonMutation = useMutation({
    ...trpc.missions.abandon.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.missions.getActive.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.missions.list.queryKey() })
      navigate('/adventure/missions')
      toast.success(t('missions.success.abandon'))
    },
    onError: (error) => toast.error(t('missions.error.internal.abandon'), { description: error.message })
  })

  if (!mission) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-muted-foreground'>{t('missions.not_found')}</p>
      </div>
    )
  }

  const characterTier = (characterData as any)?.tier ?? 1
  const canStart = characterTier >= mission.requiredTier && !hasActiveMission

  const handleStart = () => {
    startMutation.mutate({ missionId: mission.id })
  }

  const handleAbandon = () => {
    abandonMutation.mutate()
  }

  return (
    <div className='flex h-full w-full flex-col gap-6 overflow-auto p-6'>
      <div className='flex items-center gap-4'>
        <Button variant='ghost' size='icon' onClick={() => navigate('/adventure/missions')}>
          <ChevronLeft className='h-5 w-5' />
        </Button>
        <div className='flex flex-1 items-center gap-3'>
          <h1 className='text-2xl font-bold'>{t(mission.name)}</h1>
          <TierBadge tier={mission.requiredTier} />
        </div>
      </div>

      <Card>
        <CardContent>
          <p className='text-muted-foreground italic'>{t(mission.narrative)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {t('missions.phases')} ({mission.phases.length})
          </CardTitle>
        </CardHeader>
        <CardContent className='flex flex-col gap-4'>
          {mission.phases.map((phase, index) => (
            <div key={index} className='flex flex-col gap-2 rounded-lg border p-4'>
              <div className='flex items-center gap-2'>
                <span className='bg-muted flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium'>
                  {index + 1}
                </span>
                <span className='font-medium'>{t(phase.description)}</span>
              </div>
              <div className='flex flex-wrap gap-2'>
                {phase.enemies.map((enemyId, i) => {
                  const enemy = getEnemy(enemyId)
                  return (
                    <span key={i} className='bg-destructive/10 text-destructive rounded px-2 py-0.5 text-xs'>
                      {enemy ? t(enemy.name) : enemyId}
                    </span>
                  )
                })}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('missions.rewards')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex flex-wrap gap-4'>
            {mission.rewards.gold && (
              <div className='flex items-center gap-2'>
                <span className='text-muted-foreground text-sm'>{t('inventory.gold')}:</span>
                <span className='font-medium text-yellow-500'>+{mission.rewards.gold}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className='flex gap-4'>
        {isActive ? (
          <>
            <Button variant='destructive' onClick={handleAbandon} disabled={abandonMutation.isPending}>
              {t('missions.abandon')}
            </Button>
            <Button disabled>{t('missions.combat_coming_soon')}</Button>
          </>
        ) : (
          <Button onClick={handleStart} disabled={!canStart || startMutation.isPending}>
            {!canStart && hasActiveMission
              ? t('missions.has_active_mission')
              : characterTier < mission.requiredTier
                ? t('adventure.tier_locked', { tier: mission.requiredTier })
                : t('missions.start')}
          </Button>
        )}
      </div>
    </div>
  )
}
