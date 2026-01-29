'use client'

import { useEffect, useRef } from 'react'
import { trpc, trpcOptions, queryClient } from '@/utils/trpc.utils'
import { useTacticalCombatStore } from '@/stores/tactical-combat.store'

/**
 * Hook to handle enemy AI turns automatically.
 * Detects when it's an enemy's turn and executes the AI decision.
 */
export function useTacticalEnemyTurn() {
  // Use full store subscription to ensure we get updates
  const phase = useTacticalCombatStore((state) => state.phase)
  const activeUnitId = useTacticalCombatStore((state) => state.activeUnitId)

  const executingRef = useRef(false)
  const mutation = trpc.activity.executeTacticalEnemyTurn.useMutation()

  useEffect(() => {
    // Only run for enemy turns
    if (phase !== 'enemy_turn') {
      return
    }

    if (!activeUnitId) {
      return
    }

    if (executingRef.current) {
      return
    }

    const executeEnemyTurn = async () => {
      const state = useTacticalCombatStore.getState()
      const {
        participationId,
        enemyUnits,
        playerUnits,
        startEnemyMovement,
        startAttackAnimation,
        nextTurn
      } = state

      if (!participationId) {
        console.warn('[EnemyTurn] No participationId, skipping')
        nextTurn()
        return
      }

      const activeEnemy = enemyUnits.find((u) => u.id === activeUnitId)
      if (!activeEnemy) {
        console.warn('[EnemyTurn] Active enemy not found in store, skipping turn')
        nextTurn()
        return
      }

      // Check if enemy is actually alive
      if (activeEnemy.currentHealth <= 0) {
        console.warn('[EnemyTurn] Active enemy is dead, skipping turn')
        nextTurn()
        return
      }

      const alivePlayers = playerUnits.filter((u) => u.currentHealth > 0)
      if (alivePlayers.length === 0) {
        console.log('[EnemyTurn] No players left')
        nextTurn()
        return
      }

      executingRef.current = true

      try {
        const result = await mutation.mutateAsync({
          participationId,
          enemyId: activeUnitId,
          enemyMovementRange: activeEnemy.movementRange,
          enemyAttackRange: activeEnemy.attackRange,
          enemyAttackDice: 2,
          enemyAttackThreshold: 4
        })

        if (!result.success) {
          useTacticalCombatStore.getState().nextTurn()
          return
        }

        if (result.moved && result.path && result.path.length > 1) {
          startEnemyMovement(activeUnitId, result.path)

          if (result.attacked && result.targetId) {
            useTacticalCombatStore.setState({
              pendingEnemyAttack: {
                attackerId: activeUnitId,
                targetId: result.targetId,
                damageDealt: result.damageDealt ?? 0,
                targetKilled: result.targetKilled ?? false
              }
            })
          }
        } else if (result.attacked && result.targetId) {
          startAttackAnimation({
            attackerId: activeUnitId,
            targetId: result.targetId,
            damageDealt: result.damageDealt ?? 0,
            targetKilled: result.targetKilled ?? false,
            damageToAttacker: 0,
            attackerKilled: false
          })
        } else {
          useTacticalCombatStore.getState().nextTurn()
        }
        // Invalidate queries to refresh combat log data
        queryClient.invalidateQueries({ queryKey: trpcOptions.activity.list.queryKey() })
      } catch (error) {
        console.error('[EnemyTurn] Failed:', error)
        useTacticalCombatStore.getState().nextTurn()
      } finally {
        executingRef.current = false
      }
    }

    // Execute with a small delay
    const timer = setTimeout(executeEnemyTurn, 300)
    return () => clearTimeout(timer)
  }, [phase, activeUnitId, mutation])

  return {
    isExecuting: mutation.isPending,
    error: mutation.error
  }
}
