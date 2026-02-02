/**
 * Tactical Combat Store
 *
 * This directory contains the modular structure for the tactical combat store.
 * The types are separated into logical slices for better organization:
 *
 * - GridSlice: Grid dimensions, tiles, and unit arrays
 * - TurnSlice: Turn queue, current turn index, active unit
 * - UISlice: Hover state, selection, highlighted tiles
 * - ActionSlice: Pending actions, combat phase
 * - AnimationSlice: Movement and attack animation state
 * - DoctrineSlice: Doctrine selection and casting state
 *
 * The main store is still in tactical-combat.store.ts for backwards compatibility.
 * Future refactoring can migrate to the slice pattern using Zustand's StateCreator.
 */

export * from './types'

// Re-export the main store for convenience
export { useTacticalCombatStore } from '../tactical-combat.store'
