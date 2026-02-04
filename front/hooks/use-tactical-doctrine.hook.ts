'use client'

import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { trpc, trpcOptions, queryClient } from '@/utils/trpc.utils'
import { useTacticalCombatStore } from '@/stores/tactical-combat.store'
import { DOCTRINES } from '@shared/constants/doctrines'
import { DoctrineEffectType, DoctrineTarget } from '@shared/types/doctrine.types'
import { calculateAoEArea, findUnitsInAoE } from '@/lib/phaser/systems/pathfinding'
import { getMaterialById } from '@shared/constants/materials'

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
      toast.error(t('combat.error.invalid_doctrine'))
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
      toast.error(t('combat.error.doctrine_not_found'))
      return { success: false, error: 'Doctrine not found' }
    }

    // Check mana
    if (caster.currentMana < doctrine.manaCost) {
      toast.error(t('combat.error.not_enough_mana'))
      return { success: false, error: 'Not enough mana' }
    }

    setIsExecuting(true)

    try {
      // Call the backend to resolve and persist the doctrine
      // Note: mana is validated server-side from the database, not client-provided
      const result = await executeTacticalDoctrineMutation.mutateAsync({
        participationId,
        casterId: activeUnitId,
        doctrineId: selectedDoctrineId,
        targetPosition: pendingAction.targetPosition
      })

      if (result.success) {
        // Server confirmed - trigger the doctrine animation
        // Include nextEnemy data so the store can spawn the new enemy after animation completes
        startDoctrineAnimation({
          casterId: activeUnitId,
          doctrineId: selectedDoctrineId,
          targetPosition: pendingAction.targetPosition,
          affectedTiles: result.affectedTiles,
          affectedUnitIds: result.affectedUnitIds,
          effects: result.effects,
          nextEnemy: result.nextEnemy,
          goldReward: result.goldReward
        })

        // Show toast when enemy is defeated with gold reward
        if (result.goldReward) {
          // Find the killed enemy's name
          const killedEffect = result.effects.find((e) => e.killed)
          if (killedEffect) {
            const target = enemyUnits.find((u) => u.id === killedEffect.unitId)
            if (target) {
              const enemyName = target.name.includes('|')
                ? target.name.split('|').map((part) => t(part)).join(' ')
                : target.name

              // Build material drops description if any
              let materialDescription: string | undefined
              if (result.materialDrops && result.materialDrops.length > 0) {
                const materialNames = result.materialDrops.map((drop) => {
                  const material = getMaterialById(drop.materialId)
                  const name = material ? t(material.nameKey) : drop.materialId
                  return `+${drop.quantity} ${name}`
                })
                materialDescription = materialNames.join(', ')
              }

              toast.success(t('combat.enemy_defeated_reward', { enemy: enemyName, gold: result.goldReward }), {
                description: materialDescription
              })
            }
          }
        }

        // Invalidate queries to refresh data (mana and combat log)
        queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
        queryClient.invalidateQueries({ queryKey: trpcOptions.activity.list.queryKey() })

        return {
          success: true,
          affectedUnitIds: result.affectedUnitIds,
          effects: result.effects,
          goldReward: result.goldReward,
          nextEnemy: result.nextEnemy
        }
      }

      toast.error(t('combat.error.doctrine_failed'))
      return { success: false, error: 'Server returned failure' }
    } catch (error) {
      console.error('Failed to execute tactical doctrine:', error)
      const errorMessage = error instanceof Error ? error.message : t('combat.error.unknown')
      toast.error(t('combat.error.doctrine_failed'), { description: errorMessage })
      // Clear doctrine selection state on failure to reset UI
      clearDoctrineSelection()
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
    selectedDoctrineId,
    executeTacticalDoctrineMutation,
    startDoctrineAnimation,
    clearDoctrineSelection
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

    // Self-buff doctrines are those that target SELF and don't have an AoE pattern
    // This includes POWER_MODIFIER (bonus dice) and GUARANTEED_CRITICAL (ignores defense)
    const isSelfBuff = doctrine.effects.some(
      (e) => (e.type === DoctrineEffectType.POWER_MODIFIER || e.type === DoctrineEffectType.GUARANTEED_CRITICAL) &&
             e.target === DoctrineTarget.SELF
    )

    return isSelfBuff && !doctrine.aoePattern
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
      toast.error(t('combat.error.doctrine_not_found'))
      return { success: false, error: 'Doctrine not found' }
    }

    // Check mana
    if (caster.currentMana < doctrine.manaCost) {
      toast.error(t('combat.error.not_enough_mana'))
      return { success: false, error: 'Not enough mana' }
    }

    setIsExecuting(true)

    try {
      // Call the backend to activate the self-buff
      // Note: mana is validated server-side from the database, not client-provided
      const result = await useSelfBuffDoctrineMutation.mutateAsync({
        participationId,
        casterId: activeUnitId,
        doctrineId
      })

      if (result.success) {
        // Update the store with the active doctrine buff
        const { applySelfBuffDoctrine } = useTacticalCombatStore.getState()
        applySelfBuffDoctrine(activeUnitId, doctrineId)

        // Update mana in the store
        const { updateUnit } = useTacticalCombatStore.getState()
        updateUnit(activeUnitId, {
          currentMana: caster.currentMana - doctrine.manaCost
        })

        // Show success message based on doctrine effect type
        const hasGuaranteedCritical = doctrine.effects.some(
          (e) => e.type === DoctrineEffectType.GUARANTEED_CRITICAL && e.target === DoctrineTarget.SELF
        )

        if (hasGuaranteedCritical) {
          toast.success(t('combat.doctrine_activated_buff', {
            name: t(doctrine.nameKey)
          }))
        } else {
          toast.success(t('combat.doctrine_activated', {
            name: t(doctrine.nameKey),
            dice: result.bonusDice
          }))
        }

        // Invalidate queries to refresh data (mana and combat log)
        queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
        queryClient.invalidateQueries({ queryKey: trpcOptions.activity.list.queryKey() })

        return {
          success: true,
          bonusDice: result.bonusDice
        }
      }

      toast.error(t('combat.error.doctrine_failed'))
      return { success: false, error: 'Server returned failure' }
    } catch (error) {
      console.error('Failed to use self-buff doctrine:', error)
      const errorMessage = error instanceof Error ? error.message : t('combat.error.unknown')
      toast.error(t('combat.error.doctrine_failed'), { description: errorMessage })
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
