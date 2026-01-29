'use client'

import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { trpc } from '@/utils/trpc.utils'
import { useTacticalCombatStore } from '@/stores/tactical-combat.store'

/**
 * Hook to handle tactical movement with server persistence.
 * Coordinates between the tRPC backend and the Zustand store.
 */
export function useTacticalMove() {
  const { t } = useTranslation()
  const {
    participationId,
    pendingAction,
    activeUnitId,
    playerUnits,
    enemyUnits
  } = useTacticalCombatStore()

  const executeTacticalMoveMutation = trpc.activity.executeTacticalMove.useMutation()

  const confirmMove = useCallback(async () => {
    // Validate we have what we need
    if (!participationId) {
      console.warn('No participationId - running in local-only mode')
      // Fall back to local-only mode for testing
      useTacticalCombatStore.getState().confirmAction()
      return { success: true, localOnly: true }
    }

    if (!pendingAction || pendingAction.type !== 'move' || !pendingAction.path) {
      console.error('No valid move action pending')
      toast.error(t('combat.error.invalid_move'))
      return { success: false, error: 'No valid move action' }
    }

    if (!activeUnitId) {
      console.error('No active unit')
      toast.error(t('combat.error.no_active_unit'))
      return { success: false, error: 'No active unit' }
    }

    // Find the active unit to get movement range
    const allUnits = [...playerUnits, ...enemyUnits]
    const activeUnit = allUnits.find((u) => u.id === activeUnitId)
    if (!activeUnit) {
      console.error('Active unit not found')
      toast.error(t('combat.error.unit_not_found'))
      return { success: false, error: 'Active unit not found' }
    }

    try {
      // Call the backend to persist the move
      const result = await executeTacticalMoveMutation.mutateAsync({
        participationId,
        unitId: activeUnitId,
        path: pendingAction.path,
        movementRange: activeUnit.movementRange
      })

      if (result.success) {
        // Server confirmed - now trigger the animation
        // The store will handle the animation and state update
        useTacticalCombatStore.getState().confirmAction()
        return { success: true, newPosition: result.newPosition }
      }

      toast.error(t('combat.error.move_failed'))
      return { success: false, error: 'Server returned failure' }
    } catch (error) {
      console.error('Failed to execute tactical move:', error)
      const errorMessage = error instanceof Error ? error.message : t('combat.error.unknown')
      toast.error(t('combat.error.move_failed'), { description: errorMessage })
      return {
        success: false,
        error: errorMessage
      }
    }
  }, [
    t,
    participationId,
    pendingAction,
    activeUnitId,
    playerUnits,
    enemyUnits,
    executeTacticalMoveMutation
  ])

  return {
    confirmMove,
    isLoading: executeTacticalMoveMutation.isPending,
    error: executeTacticalMoveMutation.error
  }
}
