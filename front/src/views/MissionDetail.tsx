import TierBadge from '@/components/adventure/TierBadge'
import CombatArena from '@/components/combat/CombatArena'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/utils/trpc.utils'
import { ChevronLeft } from '@nsmr/pixelart-react'
import { getEnemy } from '@shared/constants/enemies'
import { getMission } from '@shared/constants/missions'
import type {
  ActiveMissionData,
  CombatLogEntry,
  DiceRollResult,
  EnemyState,
  InventoryCharacter
} from '@shared/types/gamification.types'
import { useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

export default function MissionDetail() {
  const { t } = useTranslation()
  const { missionId } = useParams<{ missionId: string }>()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: characterData } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())

  const queryOptions = trpc.missions.getActive.queryOptions() as any
  const { data: activeMission, refetch: refetchActiveMission } = useSuspenseQuery<ActiveMissionData>(queryOptions)

  const [lastAttackResults, setLastAttackResults] = useState<DiceRollResult[]>([])
  const [showDeathDialog, setShowDeathDialog] = useState(false)

  const mission = getMission(missionId || '')
  const isActive = activeMission?.mission?.name === missionId
  const hasActiveMission = !!activeMission?.mission

  const startMutation = useMutation({
    ...trpc.missions.start.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.missions.getActive.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.missions.list.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
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

  const attackMutation = useMutation({
    ...trpc.missions.attack.mutationOptions(),
    onSuccess: async (result) => {
      setLastAttackResults(result.playerAttackRolls)
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })

      // Check if character died
      if (result.characterDead) {
        queryClient.invalidateQueries({ queryKey: trpc.missions.getActive.queryKey() })
        queryClient.invalidateQueries({ queryKey: trpc.missions.list.queryKey() })
        setShowDeathDialog(true)
        return
      }

      await refetchActiveMission()

      if (result.allEnemiesDefeated) {
        toast.success(t('combat.phase_complete'))
      }
    },
    onError: (error) => toast.error(t('combat.error.attack'), { description: error.message })
  })

  const advancePhaseMutation = useMutation({
    ...trpc.missions.advancePhase.mutationOptions(),
    onSuccess: async (result) => {
      await refetchActiveMission()
      setLastAttackResults([])
      if (result.missionComplete) {
        completeMutation.mutate()
      } else {
        toast.success(t('combat.phase_advanced'))
      }
    },
    onError: (error) => toast.error(t('combat.error.advance'), { description: error.message })
  })

  const completeMutation = useMutation({
    ...trpc.missions.complete.mutationOptions(),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: trpc.missions.getActive.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.missions.list.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
      toast.success(t('combat.mission_complete'), {
        description: `+${result.rewards?.gold || 0} ${t('inventory.gold')}`
      })
      navigate('/adventure/missions')
    },
    onError: (error) => toast.error(t('combat.error.complete'), { description: error.message })
  })

  if (!mission) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-muted-foreground'>{t('missions.not_found')}</p>
      </div>
    )
  }

  const character = characterData as InventoryCharacter
  const characterTier = character?.tier ?? 1
  const currentHealth = character?.classes?.find((c) => c.className === character.currentClass)?.health ?? 0
  const canStart = characterTier >= mission.requiredTier && !hasActiveMission && currentHealth > 0
  const diceBank = (character?.data as any)?.diceBank ?? 0

  const handleStart = () => {
    startMutation.mutate({ missionId: mission.id })
  }

  const handleAbandon = () => {
    abandonMutation.mutate()
  }

  const handleAttack = (diceCount: number) => {
    attackMutation.mutate({ diceCount })
  }

  const enemyState = (activeMission?.mission?.enemyState as unknown as EnemyState[]) || []
  const combatLog = (activeMission?.mission?.combatLog as unknown as CombatLogEntry[]) || []
  const allEnemiesDefeated = enemyState.length > 0 && enemyState.every((e) => e.currentHealth <= 0)

  // Show death dialog if character died - must be checked BEFORE isActive since mission becomes inactive after death
  if (showDeathDialog) {
    return (
      <AlertDialog open={showDeathDialog} onOpenChange={setShowDeathDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('combat.death_dialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{t('combat.death_dialog.description')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => navigate('/adventure/inventory')}>
              {t('combat.death_dialog.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  if (isActive && character) {
    return (
      <div className='flex h-full w-full flex-col gap-4 overflow-auto p-4'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' onClick={() => navigate('/adventure/missions')}>
            <ChevronLeft className='h-5 w-5' />
          </Button>
          <div className='flex flex-1 items-center gap-3'>
            <h1 className='text-xl font-bold'>{t(mission.name)}</h1>
            <TierBadge tier={mission.requiredTier} />
            <span className='text-muted-foreground text-sm'>
              {t('missions.phase')} {(activeMission?.mission?.currentPhase ?? 0) + 1}/{mission.phases.length}
            </span>
          </div>
          <Button
            variant='outline'
            size='sm'
            onClick={handleAbandon}
            disabled={abandonMutation.isPending}
            className='cursor-pointer'
          >
            {t('missions.abandon')}
          </Button>
        </div>

        <CombatArena
          character={character}
          enemies={enemyState}
          combatLog={combatLog}
          diceBank={diceBank}
          onAttack={handleAttack}
          isAttacking={attackMutation.isPending}
          lastAttackResults={lastAttackResults}
          onNextPhase={allEnemiesDefeated ? () => advancePhaseMutation.mutate() : undefined}
          isAdvancing={advancePhaseMutation.isPending}
          nextPhaseLabel={
            (activeMission?.mission?.currentPhase ?? 0) + 1 >= mission.phases.length
              ? t('combat.complete_mission')
              : t('combat.next_phase')
          }
        />
      </div>
    )
  }

  // Show mission details when not active
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
        <Button onClick={handleStart} disabled={!canStart || startMutation.isPending}>
          {!canStart && hasActiveMission
            ? t('missions.has_active_mission')
            : characterTier < mission.requiredTier
              ? t('adventure.tier_locked', { tier: mission.requiredTier })
              : currentHealth <= 0
                ? t('missions.health_too_low')
                : t('missions.start')}
        </Button>
      </div>
    </div>
  )
}
