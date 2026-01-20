import LoaderButton from '@/components/common/loader-button.component'
import TierBadge from '@/components/common/tier-badge.component'
import { Badge } from '@/components/ui/badge.component'
import Button from '@/components/ui/button.component'
import Card, { CardContent, CardHeader, CardTitle } from '@/ui/card.component'
import { Progress } from '@/ui/progress.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { ChevronLeft } from '@nsmr/pixelart-react'
import { ActivityDifficulty } from '@shared/constants/activities'
import { getEnemy } from '@shared/constants/enemies'
import { type CombatLogEntry, type EnemyState, type InventoryCharacter } from '@shared/types/gamification.types'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import CombatArena from './components/combat-arena.component'

export default function ActivityDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()

  const { data: characterData } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())
  const character = characterData as InventoryCharacter

  const { data: activities } = useSuspenseQuery(trpc.activity.list.queryOptions({ characterId: character.id }))
  const activity = activities.find((a) => a.id === id)

  const participation = (activity as any)?.participation
  const [lastTurnResult, setLastTurnResult] = useState<any>(null)
  const combatLog = (participation?.combatLog as CombatLogEntry[]) || []

  const [hasJoined, setHasJoined] = useState(false)

  let initialEnemyState: EnemyState | null = null

  if (participation) {
    if (participation.currentEnemyId) {
      const template = getEnemy(participation.currentEnemyId)
      if (template) {
        initialEnemyState = {
          id: 'enemy-active',
          enemyId: template.id,
          currentHealth: participation.currentEnemyHealth ?? template.health,
          maxHealth: participation.currentEnemyMaxHealth ?? template.health
        }
      }
    } else if (activity?.status === 'Active' || activity?.status === undefined) {
      // Participation exists but no active enemy
      // If activity is active, show the first enemy as a fresh start
      const defaultEnemyId = activity?.enemies?.[0]
      const template = defaultEnemyId ? getEnemy(defaultEnemyId) : null
      if (template) {
        initialEnemyState = {
          id: 'enemy-fresh',
          enemyId: template.id,
          currentHealth: template.health,
          maxHealth: template.health
        }
      }
    }
  } else {
    // No participation yet, show preview of first enemy
    const defaultEnemyId = activity?.enemies?.[0]
    const template = defaultEnemyId ? getEnemy(defaultEnemyId) : null

    if (template) {
      initialEnemyState = {
        id: 'enemy-preview',
        enemyId: template.id,
        currentHealth: template.health,
        maxHealth: template.health
      }
    }
  }

  const [currentEnemy, setCurrentEnemy] = useState<EnemyState | null>(initialEnemyState)

  const joinMutation = useMutation({
    ...trpc.activity.join.mutationOptions(),
    onSuccess: () => {
      toast.success(t('activities.success.start'))
      queryClient.invalidateQueries({ queryKey: trpc.activity.list.queryKey() })
      setHasJoined(true)
    },
    onError: (error) => toast.error(t('activities.error.start'), { description: error.message })
  })

  const resolveTurnMutation = useMutation({
    ...trpc.activity.resolveTurn.mutationOptions(),
    onSuccess: (result: any) => {
      setLastTurnResult(result)

      if (result.isActivityCompleted) {
        toast.success(t('activities.success.complete'))
        setTimeout(() => navigate('/map'), 1500)
      } else if (result.enemyDefeated) {
        toast.success(t('combat.result_dialog.success_title'), {
          description: `+${activity?.rewardPerKill} ${t('inventory.gold')}`
        })

        if (result.nextEnemyState) {
          const nextTemplate = getEnemy(result.nextEnemyState.enemyId)
          if (nextTemplate) {
            setCurrentEnemy({
              id: result.nextEnemyState.id,
              enemyId: nextTemplate.id,
              currentHealth: result.nextEnemyState.currentHealth,
              maxHealth: result.nextEnemyState.maxHealth
            })
          }
        } else {
          setCurrentEnemy(null)
        }
      } else {
        if (currentEnemy) {
          setCurrentEnemy({
            ...currentEnemy,
            currentHealth: Math.max(0, currentEnemy.currentHealth - result.damageToEnemy)
          })
        }
      }

      queryClient.invalidateQueries({ queryKey: trpc.activity.list.queryKey() })
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
    },
    onError: (error) => toast.error(t('combat.error.attack'), { description: error.message })
  })

  if (!activity) {
    return (
      <div className='flex h-full items-center justify-center'>
        <p className='text-muted-foreground'>{t('activities.not_found')}</p>
      </div>
    )
  }

  const handleJoin = () => {
    joinMutation.mutate({ activityId: activity.id, characterId: character.id })
  }

  const handleAttack = ({ attackRolls, defenseRolls }: { attackRolls: number[]; defenseRolls: number[] }) => {
    resolveTurnMutation.mutate({
      activityId: activity.id,
      characterId: character.id,
      diceSpent: attackRolls.length,
      attackRolls,
      defenseRolls
    })
  }

  const characterTier = character?.tier ?? 1
  const activityTier =
    activity.difficulty === ActivityDifficulty.EASY ? 1 : activity.difficulty === ActivityDifficulty.NORMAL ? 2 : 3
  const canJoin = characterTier >= activityTier

  if (!hasJoined && !activity.isParticipating) {
    return (
      <div className='flex h-full w-full flex-col gap-6 overflow-auto p-6'>
        <div className='mx-auto w-full max-w-5xl space-y-6'>
          <div className='flex items-center gap-4'>
            <Button variant='ghost' size='icon' asChild>
              <Link to='/map'>
                <ChevronLeft className='h-5 w-5' />
              </Link>
            </Button>
            <div className='flex flex-1 items-center gap-3'>
              <h1 className='text-2xl font-bold'>{t(activity.name)}</h1>
              <TierBadge tier={activityTier} />
            </div>
          </div>

          <Card>
            <CardContent>
              <p className='text-muted-foreground italic'>{t(activity.description)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('activities.progress')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='space-y-2'>
                <div className='flex justify-between text-sm'>
                  <span>
                    {activity.progress} / {activity.target} {t('combat.enemies_defeated')}
                  </span>
                  <span>{Math.round((activity.progress / activity.target) * 100)}%</span>
                </div>
                <Progress value={(activity.progress / activity.target) * 100} />
              </div>
            </CardContent>
          </Card>

          <div className='flex gap-4'>
            <LoaderButton
              onClick={handleJoin}
              disabled={!canJoin}
              isLoading={joinMutation.isPending}
              label={!canJoin ? t('adventure.tier_locked', { tier: activityTier }) : t('activities.start')}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='flex h-full w-full flex-col gap-4 overflow-auto p-4'>
      <div className='mx-auto w-full max-w-5xl space-y-4'>
        <div className='flex items-center gap-4'>
          <Button variant='ghost' size='icon' asChild>
            <Link to='/map'>
              <ChevronLeft className='h-5 w-5' />
            </Link>
          </Button>
          <div className='flex flex-1 items-center justify-between gap-3'>
            <div className='flex items-center gap-3'>
              <h1 className='text-xl font-bold'>{t(activity.name)}</h1>
              <Badge variant='secondary'>{t('activities.status.active')}</Badge>
            </div>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground text-sm'>
                {activity.progress}/{activity.target}
              </span>
              <Progress value={(activity.progress / activity.target) * 100} className='w-24' />
            </div>
          </div>
        </div>

        {currentEnemy && (
          <CombatArena
            character={character}
            enemies={[currentEnemy]}
            combatLog={combatLog}
            diceBank={(character.data as any)?.diceBank ?? 0}
            onAttack={handleAttack}
            isAttacking={resolveTurnMutation.isPending}
            lastTurnResult={lastTurnResult}
          />
        )}
      </div>
    </div>
  )
}
