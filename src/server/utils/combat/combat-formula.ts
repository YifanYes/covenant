import type { DoctrineDefinition, MoveDamageType } from '@shared/types/doctrine.types'
import { DoctrineEffectType, DoctrineTarget } from '@shared/types/doctrine.types'
import type { TacticalUnitState } from '@shared/types/tactical-combat.types'
import { DOCTRINES } from '@shared/constants/doctrines'

export const CRIT_RATE = 1 / 16 // Pokémon Gen-1 base critical chance (6.25%)
export const VARIANCE_MIN = 0.85
export const VARIANCE_RANGE = 0.3 // 0.85 → 1.15

/**
 * Unit-tier → "level" mapping (locked spec). tier 1 → L20, tier 2 → L30, tier 3 → L40, tier 4 → L50.
 */
export function unitLevel(tier: number): number {
  return tier * 10 + 10
}

export interface FormulaInputs {
  level: number
  power: number
  atk: number
  def: number
  variance: number
  isCrit: boolean
}

/**
 * Locked Gen-1-style damage formula:
 *   damage = floor((((2*L/5 + 2) * power * atk/def) / 50) + 2) * variance * (isCrit ? 2 : 1)
 * DEF is floored at 1 so divide-by-zero is impossible.
 */
export function computeDamage(inputs: FormulaInputs): number {
  const def = Math.max(1, inputs.def)
  const base = Math.floor(((((2 * inputs.level) / 5 + 2) * inputs.power * inputs.atk) / def / 50) + 2)
  const dmg = base * inputs.variance * (inputs.isCrit ? 2 : 1)
  return Math.max(0, Math.floor(dmg))
}

/**
 * Sample variance in [VARIANCE_MIN, VARIANCE_MIN + VARIANCE_RANGE].
 */
export function rollVariance(): number {
  return VARIANCE_MIN + Math.random() * VARIANCE_RANGE
}

/**
 * Read caster active doctrines and aggregate the POWER_MODIFIER%/THRESHOLD_MODIFIER%/crit bonuses.
 * - POWER_MODIFIER (SELF) → +% ATK
 * - GUARANTEED_CRITICAL value=1 → guaranteed crit this hit
 * - GUARANTEED_CRITICAL value>=2 → +N% crit chance bonus this hit
 * INSPIRATION: scales atkPct with enemy tier (each tier above 1 adds the base percent again).
 */
export function aggregateCasterBuffs(
  caster: TacticalUnitState,
  enemyTier: number | undefined
): { atkPct: number; critChanceBonus: number; guaranteedCrit: boolean } {
  let atkPct = 0
  let critChanceBonus = 0
  let guaranteedCrit = false
  const active = caster.activeDoctrines
  if (!active) return { atkPct, critChanceBonus, guaranteedCrit }

  for (const [doctrineId, eff] of Object.entries(active)) {
    if (eff.remainingTurns <= 0) continue
    const def = DOCTRINES[doctrineId]
    if (!def) continue
    for (const e of def.effects) {
      if (e.target !== DoctrineTarget.SELF) continue
      if (e.type === DoctrineEffectType.POWER_MODIFIER) {
        const base = e.value ?? 0
        if (e.scalesWithEnemyTier && enemyTier && enemyTier > 1) {
          atkPct += base * enemyTier
        } else {
          atkPct += base
        }
      } else if (e.type === DoctrineEffectType.GUARANTEED_CRITICAL) {
        const v = e.value ?? 0
        if (v === 1) guaranteedCrit = true
        else if (v >= 2) critChanceBonus += v
      }
    }
  }
  return { atkPct, critChanceBonus, guaranteedCrit }
}

/**
 * Read target active doctrines for DEF buffs and Protect.
 * - THRESHOLD_MODIFIER (SELF, value=N) → +N% DEF
 * - NEGATE_HITS (SELF, value>=1) → Protect (zero incoming damage once; consumed by caller)
 * - NEGATE_HITS (SELF, value=0, thornsDamage=D) → thorns reflect; not Protect
 */
export function aggregateTargetBuffs(target: TacticalUnitState): {
  defPct: number
  protect: boolean
  thornsDamage: number
} {
  let defPct = 0
  let protect = false
  let thornsDamage = 0
  const active = target.activeDoctrines
  if (!active) return { defPct, protect, thornsDamage }

  for (const [doctrineId, eff] of Object.entries(active)) {
    if (eff.remainingTurns <= 0) continue
    const def = DOCTRINES[doctrineId]
    if (!def) continue
    for (const e of def.effects) {
      if (e.target !== DoctrineTarget.SELF) continue
      if (e.type === DoctrineEffectType.THRESHOLD_MODIFIER) {
        defPct += e.value ?? 0
      } else if (e.type === DoctrineEffectType.NEGATE_HITS) {
        const v = e.value ?? 0
        if (v >= 1) {
          protect = true
        } else if (v === 0 && (e.thornsDamage ?? 0) > 0) {
          thornsDamage = Math.max(thornsDamage, e.thornsDamage!)
        }
      }
    }
  }
  return { defPct, protect, thornsDamage }
}

/**
 * Active debuffs sitting on a unit reduce that unit's ATK (frost_bite leaves an
 * activeDoctrine on the enemy with POWER_MODIFIER target=ENEMY value<0).
 */
export function aggregateAtkDebuffPct(unit: TacticalUnitState): number {
  let pct = 0
  const active = unit.activeDoctrines
  if (!active) return pct
  for (const [doctrineId, eff] of Object.entries(active)) {
    if (eff.remainingTurns <= 0) continue
    const def = DOCTRINES[doctrineId]
    if (!def) continue
    for (const e of def.effects) {
      if (e.target !== DoctrineTarget.ENEMY) continue
      if (e.type === DoctrineEffectType.POWER_MODIFIER) {
        pct += e.value ?? 0
      }
    }
  }
  return pct
}

/**
 * Resolve a single damage move from caster → target.
 * Returns final damage applied to target HP (clamped to >=0), plus crit flag and thorns reflect.
 */
export function resolveDamageMove(args: {
  caster: TacticalUnitState
  target: TacticalUnitState
  move: DoctrineDefinition
  casterTier: number
  targetTier: number
}): { damage: number; isCrit: boolean; protected: boolean; thornsDamage: number } {
  const power = args.move.power ?? 0
  if (power <= 0) return { damage: 0, isCrit: false, protected: false, thornsDamage: 0 }

  const dmgType: MoveDamageType = args.move.damageType ?? 'PHYSICAL'
  const casterAtkBase = dmgType === 'MAGIC' ? args.caster.magicAtk : args.caster.strengthAtk
  const targetDefBase = dmgType === 'MAGIC' ? args.target.magicDef : args.target.strengthDef

  const buffs = aggregateCasterBuffs(args.caster, args.targetTier)
  const debuffPct = aggregateAtkDebuffPct(args.caster) // negative
  const targetBuffs = aggregateTargetBuffs(args.target)

  const atk = casterAtkBase * (1 + (buffs.atkPct + debuffPct) / 100)
  const def = targetDefBase * (1 + targetBuffs.defPct / 100)

  const isCrit = buffs.guaranteedCrit || Math.random() < CRIT_RATE + buffs.critChanceBonus / 100

  if (targetBuffs.protect) {
    return { damage: 0, isCrit, protected: true, thornsDamage: 0 }
  }

  const variance = rollVariance()
  const dmg = computeDamage({
    level: unitLevel(args.casterTier),
    power,
    atk: Math.max(0.1, atk),
    def: Math.max(1, def),
    variance,
    isCrit
  })

  return { damage: dmg, isCrit, protected: false, thornsDamage: targetBuffs.thornsDamage }
}

/**
 * Tier lookup for an in-combat unit: enemies carry .tier on TacticalUnitState; player tier comes from caller.
 */
export function getUnitTier(unit: TacticalUnitState, playerTier: number): number {
  if (unit.id.startsWith('player-')) return playerTier
  return unit.tier ?? 1
}
