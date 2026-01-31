'use client'
import LoaderButton from '@/common/loader-button.component'
import TierBadge from '@/common/tier-badge.component'
import AlertDialog, {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/ui/alert-dialog.component'
import { Badge } from '@/ui/badge.component'
import Button from '@/ui/button.component'
import Card, { CardContent, CardHeader, CardTitle } from '@/ui/card.component'
import { Progress } from '@/ui/progress.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { ChevronLeft } from '@nsmr/pixelart-react'
import { ActivityDifficulty, getActivityById } from '@shared/constants/activities'
import { getEnemy } from '@shared/constants/enemies'
import { type CombatLogEntry, type EnemyState, type InventoryCharacter } from '@shared/types/gamification.types'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

// Dynamic import for tactical combat (SSR-safe due to Phaser)
const TacticalCombatArena = dynamic(() => import('@/components/tactical/tactical-combat-arena.component'), {
  ssr: false
})

export default function ActivityDetailPage() {
  const { id } = useParams()
  const { t } = useTranslation()

  const { data: characterData } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())
  const character = characterData as InventoryCharacter

  const { data: activities } = useSuspenseQuery(trpcOptions.activity.list.queryOptions({ characterId: character.id }))
  const activity = activities.find((a) => a.id === id)

  const participation = (activity as any)?.participation
  const enemySpawnWeights = activity?.enemySpawnWeights

  // Get combat log from active enemy
  const activeEnemy = participation?.activeEnemy
  const combatLog = (activeEnemy?.combatLog as CombatLogEntry[]) || []

  const [hasJoined, setHasJoined] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)

  // Build enemy state from participation data (reactive to query updates)
  const currentEnemy = useMemo((): EnemyState | null => {
    if (participation?.activeEnemy) {
      const ae = participation.activeEnemy
      return {
        id: ae.id,
        templateId: ae.templateId,
        currentHealth: ae.currentHealth,
        maxHealth: ae.maxHealth,
        namePrefix: ae.namePrefix,
        nameSuffix: ae.nameSuffix
      }
    }
    if (!participation && enemySpawnWeights) {
      // No participation yet, show preview of first enemy from spawn weights
      const defaultEnemyId = Object.keys(enemySpawnWeights)[0]
      const template = getEnemy(defaultEnemyId)
      if (template) {
        return {
          id: 'enemy-preview',
          templateId: template.id,
          currentHealth: template.health,
          maxHealth: template.health
        }
      }
    }
    return null
  }, [participation, enemySpawnWeights])

  const joinMutation = useMutation({
    ...trpcOptions.activity.join.mutationOptions(),
    onSuccess: () => {
      toast.success(t('activities.success.start'))
      queryClient.invalidateQueries({ queryKey: trpcOptions.activity.list.queryKey() })
      setHasJoined(true)
    },
    onError: (error) => toast.error(t('activities.error.start'), { description: error.message })
  })

  if (!activity) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t('activities.not_found')}</p>
      </div>
    )
  }

  const handleJoin = () => {
    // Check if user is participating in any other activity
    const activeActivity = activities.find((a) => a.isParticipating && a.id !== activity.id)
    if (activeActivity) {
      setShowConfirmModal(true)
      return
    }

    joinMutation.mutate({ activityId: activity.id, characterId: character.id })
  }

  const confirmJoin = () => {
    setShowConfirmModal(false)
    joinMutation.mutate({ activityId: activity.id, characterId: character.id })
  }

  const characterTier = character?.tier ?? 1
  const activityTier =
    activity.difficulty === ActivityDifficulty.EASY ? 1 : activity.difficulty === ActivityDifficulty.NORMAL ? 2 : 3
  const canJoin = characterTier >= activityTier

  if (!hasJoined && !activity.isParticipating) {
    return (
      <div className="flex h-full w-full flex-col gap-6 overflow-auto p-6">
        <div className="mx-auto w-full max-w-5xl space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/map">
                <ChevronLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex flex-1 items-center gap-3">
              <h1 className="text-2xl font-bold">{t(activity.name)}</h1>
              <TierBadge tier={activityTier} />
            </div>
          </div>

          <Card>
            <CardContent>
              <p className="text-muted-foreground italic">{t(activity.description)}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('activities.progress')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>
                    {activity.progress} / {activity.target} {t('combat.enemies_defeated')}
                  </span>
                  <span>{Math.round((activity.progress / activity.target) * 100)}%</span>
                </div>
                <Progress value={(activity.progress / activity.target) * 100} />
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <LoaderButton
              onClick={handleJoin}
              disabled={!canJoin}
              isLoading={joinMutation.isPending}
              label={!canJoin ? t('adventure.tier_locked', { tier: activityTier }) : t('activities.start')}
            />
          </div>

          <AlertDialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('activities.switch_dialog.title')}</AlertDialogTitle>
                <AlertDialogDescription>{t('activities.switch_dialog.description')}</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={confirmJoin}>{t('activities.switch_dialog.confirm')}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-background fixed inset-0 left-(--sidebar-width) flex flex-col overflow-hidden transition-[left] duration-200 ease-linear peer-data-[state=collapsed]:left-(--sidebar-width-icon)">
      {/* Header */}
      <div className="bg-card flex-none border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/map">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex flex-1 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{t(activity.name)}</h1>
              <Badge variant="secondary">{t('activities.status.active')}</Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {activity.progress}/{activity.target}
              </span>
              <Progress value={(activity.progress / activity.target) * 100} className="w-24" />
            </div>
          </div>
        </div>
      </div>

      {/* Tactical Combat Area */}
      {currentEnemy && participation?.id && (
        <TacticalCombatArena
          character={character}
          enemies={[currentEnemy]}
          combatLog={combatLog}
          diceBank={(character.data as any)?.diceBank ?? 0}
          lastTurnResult={null}
          participationId={participation.id}
          activeDoctrines={participation?.activeDoctrines as Record<string, any>}
          failureText={getActivityById(activity.id)?.failureText}
          mapId={getActivityById(activity.id)?.mapId}
          className="min-h-0 flex-1"
        />
      )}
    </div>
  )
}
