'use client'
import { useCombatAnimations } from '@/hooks/use-combat-animations.hook'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { BASIC_STRIKE_ID, DOCTRINES, isDamageMove } from '@shared/constants/doctrines'
import { getEnemy } from '@shared/constants/enemies'
import type { CombatLogEntry, EnemyState, InventoryCharacter } from '@shared/types/gamification.types'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export type CombatPhase = 'player_input' | 'animating' | 'enemy_turn' | 'victory' | 'defeat'

export function useCombat(
  character: InventoryCharacter,
  questId: string,
  initialEnemies: EnemyState[],
  initialCombatLog: CombatLogEntry[]
) {
  const { t } = useTranslation()
  const animations = useCombatAnimations()
  const executingEnemyTurnRef = useRef(false)

  const currentClass = character.classes.find((c) => c.className === character.currentClass)!

  const { data: tacticalState } = useSuspenseQuery(trpcOptions.quest.getTacticalState.queryOptions({ questId }))

  const [localEnemies, setLocalEnemies] = useState<EnemyState[]>(initialEnemies)
  const [localLog, setLocalLog] = useState<CombatLogEntry[]>(initialCombatLog)
  const [potionUsedThisTurn, setPotionUsedThisTurn] = useState(false)
  const [playerDead, setPlayerDead] = useState(false)
  const [allEnemiesDead, setAllEnemiesDead] = useState(false)
  const [isEnemyTurn, setIsEnemyTurn] = useState(false)
  const [targetingMode, setTargetingMode] = useState<'single' | 'all' | null>(null)
  const [selectedMoveId, setSelectedMoveId] = useState<string | null>(null)

  const playerUnit = tacticalState?.units?.find((u) => u.id.startsWith('player-'))
  const playerHealth = playerUnit?.currentHealth ?? currentClass.health
  const playerMaxHealth = playerUnit?.maxHealth ?? currentClass.maxHealth
  const playerMana = playerUnit?.currentMana ?? currentClass.mana
  const playerMaxMana = playerUnit?.maxMana ?? currentClass.maxMana

  const phase: CombatPhase = useMemo(() => {
    if (playerDead) return 'defeat'
    if (allEnemiesDead) return 'victory'
    if (animations.isAnimating) return 'animating'
    if (isEnemyTurn) return 'enemy_turn'
    return 'player_input'
  }, [playerDead, allEnemiesDead, animations.isAnimating, isEnemyTurn])

  useEffect(() => {
    if (tacticalState?.units) {
      const enemyUnits = tacticalState.units.filter((u) => !u.id.startsWith('player-'))
      if (enemyUnits.length > 0) {
        const newEnemies: EnemyState[] = enemyUnits
          .filter((u) => u.currentHealth > 0)
          .map((u) => {
            const existing = localEnemies.find((e) => e.id === u.id)
            const nameParts = u.name.includes('|') ? u.name.split('|') : [u.name, '']
            return {
              id: u.id,
              templateId: u.templateId,
              currentHealth: u.currentHealth,
              maxHealth: u.maxHealth,
              currentMana: u.currentMana ?? 0,
              maxMana: u.maxMana ?? 0,
              namePrefix: existing?.namePrefix ?? nameParts[0],
              nameSuffix: existing?.nameSuffix ?? nameParts[1]
            }
          })
        // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing local UI state from server tactical state
        setLocalEnemies(newEnemies)
      }
    }
    // localEnemies intentionally omitted to avoid feedback loop
  }, [tacticalState]) // eslint-disable-line react-hooks/exhaustive-deps

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: trpcOptions.quest.list.queryKey() })
    queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
    queryClient.invalidateQueries({
      queryKey: trpcOptions.quest.getTacticalState.queryKey({ questId })
    })
  }, [questId])

  // Phase 2A: single executeMove mutation replaces attack/doctrine/self-buff trio.
  const moveMutation = useMutation(
    trpcOptions.quest.executeMove.mutationOptions({
      onSuccess: async (result) => {
        await animations.playAttackAnimation()

        for (const effect of result.effects) {
          if (effect.damageDealt && effect.damageDealt > 0) {
            await animations.showDamageNumber(
              effect.damageDealt,
              effect.isCritical ? 'critical' : 'damage',
              effect.unitId
            )
          }
          if (effect.healthRestored && effect.healthRestored > 0) {
            await animations.showDamageNumber(effect.healthRestored, 'heal', effect.unitId)
          }
          if (effect.killed) {
            await animations.playDeathAnimation()
          }
        }

        if (result.logEntries) {
          setLocalLog((prev) => [...prev, ...result.logEntries])
        }
        if (result.goldReward && result.goldReward > 0) {
          toast.success(t('combat.enemy_defeated_reward', { gold: result.goldReward }))
        }
        if (result.tierProgression) {
          toast.success(t('character.tier_up', { tier: result.tierProgression.newTier }))
        }
        if (result.casterKilled) {
          setPlayerDead(true)
        }
        if (result.nextEnemy) {
          const nameParts = result.nextEnemy.name.includes('|')
            ? result.nextEnemy.name.split('|')
            : [result.nextEnemy.name, '']
          setLocalEnemies([
            {
              id: result.nextEnemy.id,
              templateId: result.nextEnemy.templateId,
              currentHealth: result.nextEnemy.currentHealth,
              maxHealth: result.nextEnemy.maxHealth,
              currentMana: result.nextEnemy.currentMana,
              maxMana: result.nextEnemy.maxMana,
              namePrefix: nameParts[0],
              nameSuffix: nameParts[1]
            }
          ])
          setPotionUsedThisTurn(false)
        } else {
          const livingEnemies = localEnemies.filter((e) => {
            const effect = result.effects.find((ef) => ef.unitId === e.id)
            return !effect?.killed
          })
          if (livingEnemies.length === 0 && !result.casterKilled) {
            setAllEnemiesDead(true)
          }
        }

        setSelectedMoveId(null)
        setTargetingMode(null)

        if (!result.casterKilled && !result.nextEnemy) {
          // Only start enemy turn when target survived OR new enemy spawned
          const stillFighting = result.effects.some((e) => !e.killed)
          if (stillFighting && !allEnemiesDead) {
            setIsEnemyTurn(true)
          }
        } else if (result.nextEnemy) {
          // New enemy is spawned with a fresh turn order; client-side: enemy turn flag stays false.
          setIsEnemyTurn(false)
        }

        invalidateQueries()
      },
      onError: (error) => {
        toast.error(t('combat.error.attack_failed'), { description: error.message })
        setSelectedMoveId(null)
        setTargetingMode(null)
      }
    })
  )

  const enemyTurnMutation = useMutation(
    trpcOptions.quest.executeTacticalEnemyTurn.mutationOptions({
      onSuccess: async (result) => {
        await animations.playEnemyAttackAnimation()
        for (const effect of result.effects) {
          if (effect.damageDealt && effect.damageDealt > 0) {
            await animations.showDamageNumber(effect.damageDealt, 'damage', effect.unitId)
          }
        }
        if (result.logEntries) {
          setLocalLog((prev) => [...prev, ...result.logEntries])
        }
        const playerAfter = result.updatedState.units.find((u) => u.id.startsWith('player-'))
        if (playerAfter && playerAfter.currentHealth <= 0) {
          setPlayerDead(true)
        }
        setIsEnemyTurn(false)
        setPotionUsedThisTurn(false)
        invalidateQueries()
      },
      onError: (error) => {
        toast.error(t('combat.error.enemy_turn_failed'), { description: error.message })
        setIsEnemyTurn(false)
        setPotionUsedThisTurn(false)
      }
    })
  )

  const potionMutation = useMutation(
    trpcOptions.quest.usePotion.mutationOptions({
      onSuccess: async (result) => {
        if (!result.success) return
        await animations.playHealAnimation()
        if (result.healthRestored) {
          await animations.showDamageNumber(result.healthRestored, 'heal', 'player')
          toast.success(t('combat.potion_healed', { amount: result.healthRestored }))
        }
        setPotionUsedThisTurn(true)
        invalidateQueries()
      },
      onError: (error) => {
        toast.error(t('combat.error.potion_failed'), { description: error.message })
      }
    })
  )

  const executeMove = useCallback(
    (moveId: string, targetIds: string[]) => {
      moveMutation.mutate({
        questId,
        casterId: playerUnit?.id ?? 'player-1',
        moveId,
        targetIds
      })
    },
    [questId, playerUnit?.id, moveMutation]
  )

  const selectMove = useCallback(
    (moveId: string) => {
      const def = DOCTRINES[moveId]
      if (!def) return
      // Damage moves and ENEMY-targeted moves need targeting; pure self-effects fire immediately.
      const needsEnemyTarget = isDamageMove(def) || def.effects.some((e) => e.target === 'ENEMY')
      if (needsEnemyTarget) {
        setSelectedMoveId(moveId)
        setTargetingMode(def.targeting ?? 'single')
      } else {
        executeMove(moveId, [])
      }
    },
    [executeMove]
  )

  const cancelMove = useCallback(() => {
    setSelectedMoveId(null)
    setTargetingMode(null)
  }, [])

  const attackBasicStrike = useCallback(
    (targetId: string) => {
      executeMove(BASIC_STRIKE_ID, [targetId])
    },
    [executeMove]
  )

  const usePotion = useCallback(
    (consumableId: string) => {
      potionMutation.mutate({ questId, consumableId })
    },
    [questId, potionMutation]
  )

  useEffect(() => {
    if (!isEnemyTurn || executingEnemyTurnRef.current || animations.isAnimating) return

    const executeEnemyTurns = async () => {
      executingEnemyTurnRef.current = true
      await new Promise((r) => setTimeout(r, 300))

      for (const enemy of localEnemies) {
        if (enemy.currentHealth <= 0) continue
        const template = getEnemy(enemy.templateId)
        if (!template) continue
        try {
          await enemyTurnMutation.mutateAsync({ questId, enemyId: enemy.id })
        } catch {
          break
        }
        await new Promise((r) => setTimeout(r, 200))
      }
      executingEnemyTurnRef.current = false
    }
    executeEnemyTurns()
  }, [isEnemyTurn]) // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading = moveMutation.isPending || enemyTurnMutation.isPending || potionMutation.isPending

  return {
    phase,
    playerHealth,
    playerMaxHealth,
    playerMana,
    playerMaxMana,
    enemies: localEnemies,
    combatLog: localLog,
    potionUsedThisTurn,
    selectMove,
    executeMove,
    cancelMove,
    attack: attackBasicStrike,
    usePotion,
    selectedMoveId,
    targetingMode,
    animation: animations.animation,
    damageNumbers: animations.damageNumbers,
    isAnimating: animations.isAnimating,
    isLoading,
    currentClass,
    manaReserve: character.manaReserve ?? 0
  }
}
