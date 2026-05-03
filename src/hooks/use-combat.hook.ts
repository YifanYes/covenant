'use client'
import { useCombatAnimations } from '@/hooks/use-combat-animations.hook'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { DOCTRINES, SELF_BUFF_EFFECT_TYPES, SPECIAL_SELF_BUFF_DOCTRINES } from '@shared/constants/doctrines'
import { getEnemy } from '@shared/constants/enemies'
import type { CombatLogEntry, EnemyState, InventoryCharacter } from '@shared/types/gamification.types'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export type CombatPhase = 'player_input' | 'animating' | 'enemy_turn' | 'victory' | 'defeat'

export function useCombat(
  character: InventoryCharacter,
  participationId: string,
  initialEnemies: EnemyState[],
  initialCombatLog: CombatLogEntry[],
  diceBank: number
) {
  const { t } = useTranslation()
  const animations = useCombatAnimations()
  const executingEnemyTurnRef = useRef(false)

  // Get current class stats
  const currentClass = character.classes.find((c) => c.className === character.currentClass)!

  // Tactical state from server
  const { data: tacticalState } = useSuspenseQuery(
    trpcOptions.activity.getTacticalState.queryOptions({ participationId })
  )

  // Local state derived from server + client
  const [localEnemies, setLocalEnemies] = useState<EnemyState[]>(initialEnemies)
  const [localLog, setLocalLog] = useState<CombatLogEntry[]>(initialCombatLog)
  const [potionUsedThisTurn, setPotionUsedThisTurn] = useState(false)
  const [playerDead, setPlayerDead] = useState(false)
  const [allEnemiesDead, setAllEnemiesDead] = useState(false)
  const [isEnemyTurn, setIsEnemyTurn] = useState(false)
  const [targetingMode, setTargetingMode] = useState<'single' | 'all' | null>(null)
  const [selectedDoctrineId, setSelectedDoctrineId] = useState<string | null>(null)

  // Derive player health from tactical state
  const playerUnit = tacticalState?.units?.find((u) => u.id.startsWith('player-'))
  const playerHealth = playerUnit?.currentHealth ?? currentClass.health
  const playerMaxHealth = playerUnit?.maxHealth ?? currentClass.maxHealth

  // Dice roll state
  const [attackRolls, setAttackRolls] = useState<number[] | null>(null)
  const [defenseRolls, setDefenseRolls] = useState<number[] | null>(null)
  const [isRolling, setIsRolling] = useState(false)

  // Determine phase
  const phase: CombatPhase = useMemo(() => {
    if (playerDead) return 'defeat'
    if (allEnemiesDead) return 'victory'
    if (animations.isAnimating) return 'animating'
    if (isEnemyTurn) return 'enemy_turn'
    return 'player_input'
  }, [playerDead, allEnemiesDead, animations.isAnimating, isEnemyTurn])

  // Sync enemies from server state
  useEffect(() => {
    if (tacticalState?.units) {
      const enemyUnits = tacticalState.units.filter((u) => !u.id.startsWith('player-'))
      if (enemyUnits.length > 0) {
        const newEnemies: EnemyState[] = enemyUnits
          .filter((u) => u.currentHealth > 0)
          .map((u) => {
            // Try to find the existing enemy with the same ID to keep its template data
            const existing = localEnemies.find((e) => e.id === u.id)
            const nameParts = u.name.includes('|') ? u.name.split('|') : [u.name, '']
            return {
              id: u.id,
              templateId: existing?.templateId ?? '',
              currentHealth: u.currentHealth,
              maxHealth: u.maxHealth,
              namePrefix: existing?.namePrefix ?? nameParts[0],
              nameSuffix: existing?.nameSuffix ?? nameParts[1]
            }
          })
        setLocalEnemies(newEnemies)
      }
    }
  }, [tacticalState]) // eslint-disable-line react-hooks/exhaustive-deps

  const invalidateQueries = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: trpcOptions.activity.list.queryKey() })
    queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
    queryClient.invalidateQueries({
      queryKey: trpcOptions.activity.getTacticalState.queryKey({ participationId })
    })
  }, [participationId])

  // ========== Attack Mutation ==========
  const attackMutation = useMutation(
    trpcOptions.activity.executeTacticalAttack.mutationOptions({
      onSuccess: async (result) => {
        // Show attack animation
        await animations.playAttackAnimation()

        // Show damage numbers
        if (result.damageDealt > 0) {
          const isCrit = result.attackerRolls.some((r) => r.isCritical)
          await animations.showDamageNumber(result.damageDealt, isCrit ? 'critical' : 'damage', result.targetId)
        }

        // Update combat log
        if (result.logEntries) {
          setLocalLog((prev) => [...prev, ...result.logEntries!])
        }

        // Handle enemy death
        if (result.targetKilled) {
          await animations.playDeathAnimation()
          if (result.goldReward) {
            toast.success(t('combat.enemy_defeated_reward', { gold: result.goldReward }))
          }
          if (result.tierProgression) {
            toast.success(t('character.tier_up', { tier: result.tierProgression.newTier }))
          }
        }

        // Handle player death from self-damage
        if (result.attackerKilled) {
          setPlayerDead(true)
          return
        }

        // Update enemy with next enemy data or check if all enemies defeated
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
              namePrefix: nameParts[0],
              nameSuffix: nameParts[1]
            }
          ])
          setPotionUsedThisTurn(false)
        } else if (result.targetKilled) {
          setAllEnemiesDead(true)
        }

        // Clear dice rolls
        setAttackRolls(null)
        setDefenseRolls(null)

        // Start enemy turn if not victory
        if (!result.targetKilled && !result.attackerKilled) {
          setIsEnemyTurn(true)
        }

        invalidateQueries()
      },
      onError: (error) => {
        toast.error(t('combat.error.attack_failed'), { description: error.message })
        setAttackRolls(null)
        setDefenseRolls(null)
      }
    })
  )

  // ========== Enemy Turn Mutation ==========
  const enemyTurnMutation = useMutation(
    trpcOptions.activity.executeTacticalEnemyTurn.mutationOptions({
      onSuccess: async (result) => {
        // Handle status effect damage
        if (result.statusEffectDamage && result.statusEffectDamage > 0) {
          await animations.showDamageNumber(result.statusEffectDamage, 'damage', result.enemyId)
        }

        if (result.diedFromStatusEffect) {
          await animations.playDeathAnimation()
          setIsEnemyTurn(false)
          setPotionUsedThisTurn(false)
          invalidateQueries()
          return
        }

        // Animate enemy attack
        if (result.attacked) {
          await animations.playEnemyAttackAnimation()
          if (result.damageDealt && result.damageDealt > 0) {
            await animations.showDamageNumber(result.damageDealt, 'damage', 'player')
          }
        }

        // Update combat log
        if (result.logEntries) {
          setLocalLog((prev) => [...prev, ...result.logEntries!])
        }

        // Check player death
        if (result.targetKilled) {
          setPlayerDead(true)
        }

        // Mana regen notification
        if (result.manaRegenerated && result.manaRegenerated > 0) {
          toast.info(t('combat.log.mana_regen', { mana: result.manaRegenerated }))
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

  // ========== Doctrine Mutation ==========
  const doctrineMutation = useMutation(
    trpcOptions.activity.executeTacticalDoctrine.mutationOptions({
      onSuccess: async (result) => {
        if (!result.success) return

        await animations.playDoctrineAnimation()

        // Show damage numbers for each affected enemy
        for (const effect of result.effects) {
          if (effect.damageDealt && effect.damageDealt > 0) {
            await animations.showDamageNumber(effect.damageDealt, 'damage', effect.unitId)
          }
          if (effect.healthRestored && effect.healthRestored > 0) {
            await animations.showDamageNumber(effect.healthRestored, 'heal', effect.unitId)
          }
          if (effect.killed) {
            await animations.playDeathAnimation()
          }
        }

        if (result.logEntries) {
          setLocalLog((prev) => [...prev, ...result.logEntries!])
        }

        if (result.goldReward) {
          toast.success(t('combat.enemy_defeated_reward', { gold: result.goldReward }))
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
              namePrefix: nameParts[0],
              nameSuffix: nameParts[1]
            }
          ])
          setPotionUsedThisTurn(false)
        } else {
          const anyAlive = result.effects.some((e) => !e.killed)
          if (!anyAlive || result.effects.every((e) => e.killed)) {
            // Check if all enemies are dead
            const livingEnemies = localEnemies.filter((e) => {
              const effect = result.effects.find((ef) => ef.unitId === e.id)
              return !effect?.killed
            })
            if (livingEnemies.length === 0) {
              setAllEnemiesDead(true)
            }
          }
        }

        setSelectedDoctrineId(null)
        setTargetingMode(null)

        // Start enemy turn if no victory
        if (!allEnemiesDead) {
          setIsEnemyTurn(true)
        }

        invalidateQueries()
      },
      onError: (error) => {
        toast.error(t('combat.error.doctrine_failed'), { description: error.message })
        setSelectedDoctrineId(null)
        setTargetingMode(null)
      }
    })
  )

  // ========== Self-Buff Doctrine Mutation ==========
  const selfBuffMutation = useMutation(
    trpcOptions.activity.useSelfBuffDoctrine.mutationOptions({
      onSuccess: async (result) => {
        if (!result.success) return

        await animations.playDoctrineAnimation()

        toast.info(t('combat.doctrine_buff_applied', { dice: result.bonusDice }))

        setSelectedDoctrineId(null)
        setTargetingMode(null)

        // Self-buff ends player action, start enemy turn
        setIsEnemyTurn(true)
        invalidateQueries()
      },
      onError: (error) => {
        toast.error(t('combat.error.doctrine_failed'), { description: error.message })
        setSelectedDoctrineId(null)
        setTargetingMode(null)
      }
    })
  )

  // ========== Potion Mutation ==========
  const potionMutation = useMutation(
    trpcOptions.activity.usePotion.mutationOptions({
      onSuccess: async (result) => {
        if (!result.success) return

        await animations.playHealAnimation()

        if (result.healthRestored) {
          await animations.showDamageNumber(result.healthRestored, 'heal', 'player')
          toast.success(t('combat.potion_healed', { amount: result.healthRestored }))
        }
        if (result.manaRestored) {
          toast.success(t('combat.potion_mana', { amount: result.manaRestored }))
        }

        setPotionUsedThisTurn(true)
        invalidateQueries()
      },
      onError: (error) => {
        toast.error(t('combat.error.potion_failed'), { description: error.message })
      }
    })
  )

  // ========== Actions ==========

  const rollDice = useCallback(() => {
    if (diceBank <= 0) return

    setIsRolling(true)
    const attackCount = currentClass.strengthAtk
    const defenseCount = currentClass.strengthDef

    // Generate random rolls
    const aRolls = Array.from({ length: attackCount }, () => Math.floor(Math.random() * 6) + 1)
    const dRolls = Array.from({ length: defenseCount }, () => Math.floor(Math.random() * 6) + 1)

    // Animate then set
    setTimeout(() => {
      setAttackRolls(aRolls)
      setDefenseRolls(dRolls)
      setIsRolling(false)
    }, 800)
  }, [diceBank, currentClass.strengthAtk, currentClass.strengthDef])

  const attack = useCallback(
    (targetId: string) => {
      if (!attackRolls || !defenseRolls) {
        toast.error(t('combat.use_dice_roller'))
        return
      }

      attackMutation.mutate({
        participationId,
        attackerId: playerUnit?.id ?? 'player-1',
        targetId,
        attackRolls,
        defenseRolls,
        attackThreshold: 4, // Base threshold
        defenseThreshold: 4,
        attackCriticalThreshold: 6
      })
    },
    [attackRolls, defenseRolls, participationId, playerUnit?.id, attackMutation, t]
  )

  const castDoctrine = useCallback(
    (doctrineId: string, targetIds: string[]) => {
      const doctrine = DOCTRINES[doctrineId]
      if (!doctrine) return

      // Check if it's a self-buff
      const isSelfBuff =
        SPECIAL_SELF_BUFF_DOCTRINES.includes(doctrineId) ||
        doctrine.effects.every((e) => SELF_BUFF_EFFECT_TYPES.includes(e.type))

      if (isSelfBuff) {
        selfBuffMutation.mutate({
          participationId,
          casterId: playerUnit?.id ?? 'player-1',
          doctrineId
        })
      } else {
        doctrineMutation.mutate({
          participationId,
          casterId: playerUnit?.id ?? 'player-1',
          doctrineId,
          targeting: doctrine.targeting ?? 'single',
          targetIds
        })
      }
    },
    [participationId, playerUnit?.id, doctrineMutation, selfBuffMutation]
  )

  const usePotion = useCallback(
    (consumableId: string) => {
      potionMutation.mutate({ participationId, consumableId })
    },
    [participationId, potionMutation]
  )

  const selectDoctrine = useCallback(
    (doctrineId: string) => {
      const doctrine = DOCTRINES[doctrineId]
      if (!doctrine) return

      const isSelfBuff =
        SPECIAL_SELF_BUFF_DOCTRINES.includes(doctrineId) ||
        doctrine.effects.every((e) => SELF_BUFF_EFFECT_TYPES.includes(e.type))

      if (isSelfBuff) {
        // Cast immediately
        castDoctrine(doctrineId, [])
      } else {
        // Enter targeting mode
        setSelectedDoctrineId(doctrineId)
        setTargetingMode(doctrine.targeting ?? 'single')
      }
    },
    [castDoctrine]
  )

  const cancelDoctrine = useCallback(() => {
    setSelectedDoctrineId(null)
    setTargetingMode(null)
  }, [])

  // ========== Enemy Turn Execution ==========
  useEffect(() => {
    if (!isEnemyTurn || executingEnemyTurnRef.current || animations.isAnimating) return

    const executeEnemyTurns = async () => {
      executingEnemyTurnRef.current = true

      // Wait a moment before starting
      await new Promise((r) => setTimeout(r, 300))

      for (const enemy of localEnemies) {
        if (enemy.currentHealth <= 0) continue

        const template = getEnemy(enemy.templateId)
        if (!template) continue

        try {
          await enemyTurnMutation.mutateAsync({
            participationId,
            enemyId: enemy.id,
            enemyAttackDice: template.attackDice,
            enemyAttackThreshold: 4
          })
        } catch {
          // Error handled in mutation onError
          break
        }

        // Small delay between enemies
        await new Promise((r) => setTimeout(r, 200))
      }

      executingEnemyTurnRef.current = false
    }

    executeEnemyTurns()
  }, [isEnemyTurn]) // eslint-disable-line react-hooks/exhaustive-deps

  const isLoading =
    attackMutation.isPending ||
    enemyTurnMutation.isPending ||
    doctrineMutation.isPending ||
    selfBuffMutation.isPending ||
    potionMutation.isPending

  return {
    // State
    phase,
    playerHealth,
    playerMaxHealth,
    playerMana: currentClass.mana,
    playerMaxMana: currentClass.maxMana,
    enemies: localEnemies,
    combatLog: localLog,
    potionUsedThisTurn,

    // Dice
    attackRolls,
    defenseRolls,
    isRolling,
    rollDice,

    // Actions
    attack,
    castDoctrine,
    selectDoctrine,
    cancelDoctrine,
    usePotion,
    selectedDoctrineId,
    targetingMode,

    // Animation
    animation: animations.animation,
    damageNumbers: animations.damageNumbers,
    isAnimating: animations.isAnimating,

    // Loading
    isLoading,

    // Character data
    currentClass,
    diceBank
  }
}
