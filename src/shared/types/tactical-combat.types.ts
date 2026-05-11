import { z } from 'zod'
import type { ActiveStatusEffect } from './ability.types'
import type { CombatLogEntry } from './gamification.types'

// Pokémon-style combat state persisted on CharacterQuest.tacticalState (JSON column).
// No grid, no tiles, no positions — the engine resolves moves between a player and a
// single active enemy. Legacy grid fields (tiles, gridWidth, gridHeight, mapTemplateId,
// turnNumber, per-unit position/hasMoved) were removed when Phaser was retired.

// Unit snapshot persisted inside a tactical state.
export interface TacticalUnitState {
  id: string
  name: string
  templateId?: string // Enemy template ID (for getEnemy lookup); omitted on player.
  currentHealth: number
  maxHealth: number
  currentMana: number
  maxMana: number
  speed: number // Pokémon-style turn order; higher acts first.
  // Stat snapshot at combat init (class base + item bonuses); used by combat-formula.
  strengthAtk: number
  strengthDef: number
  magicAtk: number
  magicDef: number
  tier?: number
  moves?: string[] // Enemy-only: move IDs the AI can pick from.
  activeAbilities?: Record<string, ActiveStatusEffect> // Self-buff effects.
  activeEffects?: ActiveStatusEffect[] // DoT / stun / etc.
}

// Persisted combat state.
export interface TacticalStateData {
  units: TacticalUnitState[]
  turnOrder: string[] // Unit IDs in turn order.
  currentTurnIndex: number
  potionUsedThisTurn?: boolean
}

// Zod schemas for tolerant rehydration of the JSON column. Unknown / legacy fields
// (tiles, gridWidth, turnNumber, position, hasMoved, hasActed, stateVersion …) are
// dropped, and a malformed row parses to `null` so the caller can return cleanly
// instead of crashing the combat hook.
const activeStatusEffectSchema: z.ZodType<ActiveStatusEffect> = z.any()

export const tacticalUnitStateSchema: z.ZodType<TacticalUnitState> = z.object({
  id: z.string(),
  name: z.string(),
  templateId: z.string().optional(),
  currentHealth: z.number(),
  maxHealth: z.number(),
  currentMana: z.number(),
  maxMana: z.number(),
  speed: z.number(),
  strengthAtk: z.number(),
  strengthDef: z.number(),
  magicAtk: z.number(),
  magicDef: z.number(),
  tier: z.number().optional(),
  moves: z.array(z.string()).optional(),
  activeAbilities: z.record(z.string(), activeStatusEffectSchema).optional(),
  activeEffects: z.array(activeStatusEffectSchema).optional()
})

export const tacticalStateDataSchema: z.ZodType<TacticalStateData> = z.object({
  units: z.array(tacticalUnitStateSchema),
  turnOrder: z.array(z.string()),
  currentTurnIndex: z.number(),
  potionUsedThisTurn: z.boolean().optional()
})

export function parseTacticalState(raw: unknown): TacticalStateData | null {
  if (raw == null || typeof raw !== 'object') return null
  const result = tacticalStateDataSchema.safeParse(raw)
  return result.success ? result.data : null
}

// Move-resolution result types — returned by executeMove (the single combat entry point).

export interface MoveEffectResult {
  unitId: string
  damageDealt?: number
  healthRestored?: number
  statusApplied?: string
  killed?: boolean
  isCritical?: boolean
}

export interface TacticalMoveResultBase {
  casterId: string
  moveId: string
  targeting: 'single' | 'all'
  affectedUnitIds: string[]
  effects: MoveEffectResult[]
  manaCost: number
  updatedState: TacticalStateData
  logEntries: CombatLogEntry[]
  recoilDamage?: number
  casterKilled?: boolean
  goldReward?: number
  nextEnemy?: {
    id: string
    templateId: string
    name: string
    currentHealth: number
    maxHealth: number
    currentMana: number
    maxMana: number
  }
  tierProgression?: { oldTier: number; newTier: number }
}

export interface TacticalMoveResultSuccess extends TacticalMoveResultBase {
  success: true
  newMana: number
}

export interface TacticalMoveResultFailure extends TacticalMoveResultBase {
  success: false
}

export type TacticalMoveResult = TacticalMoveResultSuccess | TacticalMoveResultFailure
