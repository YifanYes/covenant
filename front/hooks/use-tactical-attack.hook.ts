'use client'

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { trpc, queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useTacticalCombatStore } from '@/stores/tactical-combat.store'

interface AttackParams {
  attackRolls: number[]
  defenseRolls: number[]
}

/**
 * Hook to handle tactical attacks with server persistence.
 * Coordinates between the tRPC backend and the Zustand store.
 */
export function useTacticalAttack() {
  const { t } = useTranslation()
  const {
    participationId,
    pendingAction,
    activeUnitId,
    playerUnits,
    enemyUnits,
    startAttackAnimation
  } = useTacticalCombatStore()

  const [isExecuting, setIsExecuting] = useState(false)

  const executeTacticalAttackMutation = trpc.activity.executeTacticalAttack.useMutation()

  const confirmAttack = useCallback(async (params: AttackParams) => {
    // Validate we have what we need
    if (!participationId) {
      console.warn('No participationId - cannot execute attack')
      toast.error(t('combat.error.no_participation'))
      return { success: false, error: 'No participation ID' }
    }

    if (!pendingAction || pendingAction.type !== 'attack' || !pendingAction.targetUnitIds?.length) {
      console.error('No valid attack action pending')
      toast.error(t('combat.error.invalid_attack', 'No valid attack target'))
      return { success: false, error: 'No valid attack action' }
    }

    if (!activeUnitId) {
      console.error('No active unit')
      toast.error(t('combat.error.no_active_unit'))
      return { success: false, error: 'No active unit' }
    }

    // Find the active unit (attacker)
    const allUnits = [...playerUnits, ...enemyUnits]
    const attacker = allUnits.find((u) => u.id === activeUnitId)
    if (!attacker) {
      console.error('Active unit not found')
      toast.error(t('combat.error.unit_not_found'))
      return { success: false, error: 'Active unit not found' }
    }

    // Find the target
    const targetId = pendingAction.targetUnitIds[0]
    const target = allUnits.find((u) => u.id === targetId)
    if (!target) {
      console.error('Target unit not found')
      toast.error(t('combat.error.target_not_found', 'Target not found'))
      return { success: false, error: 'Target not found' }
    }

    setIsExecuting(true)

    try {
      // Call the backend to resolve and persist the attack
      const result = await executeTacticalAttackMutation.mutateAsync({
        participationId,
        attackerId: activeUnitId,
        targetId,
        attackRolls: params.attackRolls,
        defenseRolls: params.defenseRolls,
        attackRange: attacker.attackRange,
        // Use default thresholds for now (can be enhanced to use weapon stats)
        attackThreshold: 4,
        defenseThreshold: 4,
        attackCriticalThreshold: 6
      })

      if (result.success) {
        // Server confirmed - trigger the attack animation
        // Include nextEnemy data so the store can spawn the new enemy after animation completes
        startAttackAnimation({
          attackerId: activeUnitId,
          targetId,
          damageDealt: result.damageDealt,
          targetKilled: result.targetKilled,
          damageToAttacker: result.damageToAttacker,
          attackerKilled: result.attackerKilled,
          nextEnemy: result.nextEnemy,
          goldReward: result.goldReward
        })

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: trpcOptions.activity.list.queryKey() })
        // Also invalidate tactical state to ensure sync
        if (result.targetKilled) {
          queryClient.invalidateQueries({ queryKey: trpcOptions.activity.getTacticalState.queryKey({ participationId }) })
        }

        return {
          success: true,
          damageDealt: result.damageDealt,
          targetKilled: result.targetKilled,
          attackerRolls: result.attackerRolls,
          defenderRolls: result.defenderRolls,
          goldReward: result.goldReward,
          nextEnemy: result.nextEnemy
        }
      }

      toast.error(t('combat.error.attack_failed', 'Attack failed'))
      return { success: false, error: 'Server returned failure' }
    } catch (error) {
      console.error('Failed to execute tactical attack:', error)
      const errorMessage = error instanceof Error ? error.message : t('combat.error.unknown')
      toast.error(t('combat.error.attack_failed', 'Attack failed'), { description: errorMessage })
      return {
        success: false,
        error: errorMessage
      }
    } finally {
      setIsExecuting(false)
    }
  }, [
    t,
    participationId,
    pendingAction,
    activeUnitId,
    playerUnits,
    enemyUnits,
    executeTacticalAttackMutation,
    startAttackAnimation
  ])

  // Get info about the pending attack for UI
  const getPendingAttackInfo = useCallback(() => {
    if (!pendingAction || pendingAction.type !== 'attack' || !pendingAction.targetUnitIds?.length) {
      return null
    }

    const targetId = pendingAction.targetUnitIds[0]
    const allUnits = [...playerUnits, ...enemyUnits]
    const target = allUnits.find((u) => u.id === targetId)
    const attacker = allUnits.find((u) => u.id === activeUnitId)

    return {
      attacker,
      target,
      targetId
    }
  }, [pendingAction, playerUnits, enemyUnits, activeUnitId])

  return {
    confirmAttack,
    getPendingAttackInfo,
    isLoading: isExecuting || executeTacticalAttackMutation.isPending,
    error: executeTacticalAttackMutation.error
  }
}
