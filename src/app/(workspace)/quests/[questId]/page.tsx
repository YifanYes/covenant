'use client'

import CombatArena from '@/components/combat/combat-arena.component'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/cn.lib'
import { getEnemy } from '@/shared/constants/enemies.constants'
import { getQuestById } from '@/shared/constants/quests.constants'
import { Badge } from '@/ui/badge.component'
import Button from '@/ui/button.component'
import { Progress } from '@/ui/progress.component'
import { useSidebar } from '@/ui/sidebar.component'
import { trpcOptions } from '@/utils/trpc.utils'
import { type CombatLogEntry, type EnemyState, type InventoryCharacter } from '@shared/types/gamification.types'
import { useSuspenseQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft } from 'pixelarticons/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

export default function QuestDetailPage() {
  const { questId: questPublicId } = useParams<{ questId: string }>()
  const { t } = useTranslation()
  const { state: sidebarState } = useSidebar()
  const isMobile = useIsMobile()

  const { data: characterData } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())
  const character = characterData as unknown as InventoryCharacter

  const { data: activeQuest } = useSuspenseQuery(
    trpcOptions.quest.getActive.queryOptions({ characterSlug: character.slug })
  )

  const questTemplate = getQuestById(activeQuest?.questId ?? '')
  const activeEnemy = activeQuest?.activeEnemy
  const combatLog = useMemo<CombatLogEntry[]>(() => [], [])

  // Hydrate mana from the enemy template so the MP bar renders even when the persisted
  // tactical state is stale (version mismatch returns null). useCombat overwrites with
  // the server-authoritative value once tactical state syncs.
  const currentEnemy = useMemo((): EnemyState | null => {
    if (!activeEnemy) return null
    const template = getEnemy(activeEnemy.templateId)
    const enemyMana = template?.mana ?? 0
    return {
      id: activeEnemy.publicId,
      templateId: activeEnemy.templateId,
      currentHealth: activeEnemy.currentHealth,
      maxHealth: activeEnemy.maxHealth,
      currentMana: enemyMana,
      maxMana: enemyMana,
      namePrefix: activeEnemy.namePrefix,
      nameSuffix: activeEnemy.nameSuffix
    }
  }, [activeEnemy])

  if (!activeQuest || activeQuest.publicId !== questPublicId) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-muted-foreground">{t('quests.not_found')}</p>
      </div>
    )
  }

  const progress = activeQuest.progress ?? 0
  const target = activeQuest.target ?? 1

  return (
    <div
      className={cn(
        'bg-background fixed inset-0 flex flex-col overflow-hidden transition-[left] duration-200 ease-linear',
        !isMobile && (sidebarState === 'collapsed' ? 'left-(--sidebar-width-icon)' : 'left-(--sidebar-width)')
      )}
    >
      {/* Header */}
      <div className="bg-card flex-none border-b px-4 py-2">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/quests">
              <ChevronLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex flex-1 items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold">{questTemplate ? t(questTemplate.name) : t('quests.unknown')}</h1>
              <Badge className="border-emerald-600 bg-emerald-600/15 text-emerald-400">
                {t('quests.status.active')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">
                {progress}/{target}
              </span>
              <Progress value={(progress / target) * 100} className="w-24 border bg-border" />
            </div>
          </div>
        </div>
      </div>

      {/* Combat Area */}
      {currentEnemy && (
        <CombatArena
          character={character}
          enemies={[currentEnemy]}
          combatLog={combatLog}
          questId={questPublicId}
          sceneId={questTemplate?.id}
          className="min-h-0 flex-1"
        />
      )}

      {!currentEnemy && (
        <div className="flex min-h-0 flex-1 items-center justify-center">
          <div className="text-muted-foreground animate-pulse">{t('combat.spawning_enemy')}</div>
        </div>
      )}
    </div>
  )
}
