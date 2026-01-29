'use client'

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { trpc, queryClient, trpcOptions } from '@/utils/trpc.utils'
import { useTacticalCombatStore } from '@/stores/tactical-combat.store'
import { DOCTRINES } from '@shared/constants/doctrines'
import { DoctrineEffectType, DoctrineTarget } from '@shared/types/doctrine.types'
import { calculateAoEArea, findUnitsInAoE } from '@/lib/phaser/systems/pathfinding'

/**
 * Hook to handle tactical doctrine usage with AoE targeting.
 * Coordinates between the tRPC backend and the Zustand store.
 */
export function useTacticalDoctrine() {
  const { t } = useTranslation()
  const {
    participationId,
    pendingAction,
    activeUnitId,
    playerUnits,
    enemyUnits,
    selectedDoctrineId,
    gridWidth,
    gridHeight,
    clearDoctrineSelection,
    startDoctrineAnimation
  } = useTacticalCombatStore()

  const [isExecuting, setIsExecuting] = useState(false)

  const executeTacticalDoctrineMutation = trpc.activity.executeTacticalDoctrine.useMutation()

  const confirmDoctrine = useCallback(async () => {
    // Validate we have what we need
    if (!participationId) {
      console.warn('No participationId - cannot execute doctrine')
      toast.error(t('combat.error.no_participation'))
      return { success: false, error: 'No participation ID' }
    }

    if (!selectedDoctrineId || !pendingAction || pendingAction.type !== 'doctrine' || !pendingAction.targetPosition) {
      console.error('No valid doctrine action pending')
      toast.error(t('combat.error.invalid_doctrine', 'No valid doctrine target'))
      return { success: false, error: 'No valid doctrine action' }
    }

    if (!activeUnitId) {
      console.error('No active unit')
      toast.error(t('combat.error.no_active_unit'))
      return { success: false, error: 'No active unit' }
    }

    // Find the active unit (caster)
    const caster = playerUnits.find((u) => u.id === activeUnitId)
    if (!caster) {
      console.error('Caster unit not found')
      toast.error(t('combat.error.unit_not_found'))
      return { success: false, error: 'Caster unit not found' }
    }

    // Get doctrine definition
    const doctrine = DOCTRINES[selectedDoctrineId]
    if (!doctrine) {
      console.error('Doctrine not found')
      toast.error(t('combat.error.doctrine_not_found', 'Doctrine not found'))
      return { success: false, error: 'Doctrine not found' }
    }

    // Check mana
    if (caster.currentMana < doctrine.manaCost) {
      toast.error(t('combat.error.not_enough_mana', 'Not enough mana'))
      return { success: false, error: 'Not enough mana' }
    }

    setIsExecuting(true)

    try {
      // Call the backend to resolve and persist the doctrine
      const result = await executeTacticalDoctrineMutation.mutateAsync({
        participationId,
        casterId: activeUnitId,
        doctrineId: selectedDoctrineId,
        targetPosition: pendingAction.targetPosition,
        casterMana: caster.currentMana
      })

      if (result.success) {
        // Server confirmed - trigger the doctrine animation
        startDoctrineAnimation({
          casterId: activeUnitId,
          doctrineId: selectedDoctrineId,
          targetPosition: pendingAction.targetPosition,
          affectedTiles: result.affectedTiles,
          affectedUnitIds: result.affectedUnitIds,
          effects: result.effects
        })

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: trpc.activity.list.queryKey() })

        return {
          success: true,
          affectedUnitIds: result.affectedUnitIds,
          effects: result.effects
        }
      }

      toast.error(t('combat.error.doctrine_failed', 'Doctrine cast failed'))
      return { success: false, error: 'Server returned failure' }
    } catch (error) {
      console.error('Failed to execute tactical doctrine:', error)
      const errorMessage = error instanceof Error ? error.message : t('combat.error.unknown')
      toast.error(t('combat.error.doctrine_failed', 'Doctrine cast failed'), { description: errorMessage })
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
    selectedDoctrineId,
    executeTacticalDoctrineMutation,
    startDoctrineAnimation
  ])

  // Get info about the pending doctrine for UI
  const getPendingDoctrineInfo = useCallback(() => {
    if (!selectedDoctrineId || !pendingAction || pendingAction.type !== 'doctrine') {
      return null
    }

    const doctrine = DOCTRINES[selectedDoctrineId]
    if (!doctrine) return null

    const caster = playerUnits.find((u) => u.id === activeUnitId)
    if (!caster) return null

    // Calculate affected area if we have a target position
    let affectedTiles: { x: number; y: number }[] = []
    let affectedUnits: string[] = []

    if (pendingAction.targetPosition) {
      affectedTiles = calculateAoEArea(
        pendingAction.targetPosition,
        caster.position,
        selectedDoctrineId,
        gridWidth,
        gridHeight
      )

      const allUnits = [...playerUnits, ...enemyUnits]
      affectedUnits = findUnitsInAoE(affectedTiles, allUnits, false, caster.isPlayer)
    }

    return {
      doctrine,
      caster,
      targetPosition: pendingAction.targetPosition,
      affectedTiles,
      affectedUnits,
      canCast: caster.currentMana >= doctrine.manaCost
    }
  }, [selectedDoctrineId, pendingAction, playerUnits, enemyUnits, activeUnitId, gridWidth, gridHeight])

  // Cancel doctrine selection
  const cancelDoctrine = useCallback(() => {
    clearDoctrineSelection()
  }, [clearDoctrineSelection])

  // Check if a doctrine is a self-buff (no targeting required)
  const isSelfBuffDoctrine = useCallback((doctrineId: string) => {
    const doctrine = DOCTRINES[doctrineId]
    if (!doctrine) return false

    return doctrine.effects.some(
      (e) => e.type === DoctrineEffectType.POWER_MODIFIER && e.target === DoctrineTarget.SELF
    ) && !doctrine.aoePattern
  }, [])

  // Use self-buff doctrine mutation
  const useSelfBuffDoctrineMutation = trpc.activity.useSelfBuffDoctrine.useMutation()

  // Confirm self-buff doctrine (no targeting required)
  const confirmSelfBuff = useCallback(async (doctrineId: string) => {
    // Validate we have what we need
    if (!participationId) {
      console.warn('No participationId - cannot use self-buff doctrine')
      toast.error(t('combat.error.no_participation'))
      return { success: false, error: 'No participation ID' }
    }

    if (!activeUnitId) {
      console.error('No active unit')
      toast.error(t('combat.error.no_active_unit'))
      return { success: false, error: 'No active unit' }
    }

    // Find the active unit (caster)
    const caster = playerUnits.find((u) => u.id === activeUnitId)
    if (!caster) {
      console.error('Caster unit not found')
      toast.error(t('combat.error.unit_not_found'))
      return { success: false, error: 'Caster unit not found' }
    }

    // Get doctrine definition
    const doctrine = DOCTRINES[doctrineId]
    if (!doctrine) {
      console.error('Doctrine not found')
      toast.error(t('combat.error.doctrine_not_found', 'Doctrine not found'))
      return { success: false, error: 'Doctrine not found' }
    }

    // Check mana
    if (caster.currentMana < doctrine.manaCost) {
      toast.error(t('combat.error.not_enough_mana', 'Not enough mana'))
      return { success: false, error: 'Not enough mana' }
    }

    setIsExecuting(true)

    try {
      // Call the backend to activate the self-buff
      const result = await useSelfBuffDoctrineMutation.mutateAsync({
        participationId,
        casterId: activeUnitId,
        doctrineId,
        casterMana: caster.currentMana
      })

      if (result.success) {
        // Update the store with the active doctrine buff
        const { applySelfBuffDoctrine } = useTacticalCombatStore.getState()
        applySelfBuffDoctrine(activeUnitId, doctrineId, result.bonusDice)

        // Update mana in the store
        const { updateUnit } = useTacticalCombatStore.getState()
        updateUnit(activeUnitId, {
          currentMana: caster.currentMana - doctrine.manaCost
        })

        // Show success message
        toast.success(t('combat.doctrine_activated', '{{name}} activated! +{{dice}} power dice to next attack', {
          name: t(doctrine.nameKey),
          dice: result.bonusDice
        }))

        // Invalidate queries to refresh data
        queryClient.invalidateQueries({ queryKey: trpc.activity.list.queryKey() })

        return {
          success: true,
          bonusDice: result.bonusDice
        }
      }

      toast.error(t('combat.error.doctrine_failed', 'Doctrine cast failed'))
      return { success: false, error: 'Server returned failure' }
    } catch (error) {
      console.error('Failed to use self-buff doctrine:', error)
      const errorMessage = error instanceof Error ? error.message : t('combat.error.unknown')
      toast.error(t('combat.error.doctrine_failed', 'Doctrine cast failed'), { description: errorMessage })
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
    activeUnitId,
    playerUnits,
    useSelfBuffDoctrineMutation
  ])

  return {
    confirmDoctrine,
    confirmSelfBuff,
    cancelDoctrine,
    getPendingDoctrineInfo,
    isSelfBuffDoctrine,
    isLoading: isExecuting || executeTacticalDoctrineMutation.isPending || useSelfBuffDoctrineMutation.isPending,
    error: executeTacticalDoctrineMutation.error || useSelfBuffDoctrineMutation.error
  }
}
