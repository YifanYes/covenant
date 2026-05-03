import { DOCTRINES } from '@shared/constants/doctrines'
import { DoctrineEffectType, DoctrineTarget, type ActiveStatusEffect } from '@shared/types/doctrine.types'

export interface DoctrineBuffs {
  bonusDice: number
  sixesGenerateExtraHits: boolean
  thresholdMod: number
  negateHits: number
  guaranteedCritical: boolean
  criticalThresholdMod: number
  defenseZero: boolean
  onesHurtSelf: boolean
  thornsDamage: number
}

/**
 * Get all active self-buff modifiers from doctrines on a unit.
 * Returns bonus dice, threshold modifiers, negate hits, and critical modifiers.
 */
export function getActiveDoctrineBuffs(
  unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined,
  incomingHits?: number
): DoctrineBuffs {
  if (!unitActiveDoctrines) {
    return {
      bonusDice: 0,
      sixesGenerateExtraHits: false,
      thresholdMod: 0,
      negateHits: 0,
      guaranteedCritical: false,
      criticalThresholdMod: 0,
      defenseZero: false,
      onesHurtSelf: false,
      thornsDamage: 0
    }
  }

  let bonusDice = 0
  let sixesGenerateExtraHits = false
  let thresholdMod = 0
  let negateHits = 0
  let guaranteedCritical = false
  let criticalThresholdMod = 0
  let defenseZero = false
  let onesHurtSelf = false
  let thornsDamage = 0

  // Doctrines that set defense to 0
  const defenseZeroDoctrines = ['reckless_strike', 'audacity']
  // Doctrines where rolling 1s hurts self
  const onesHurtSelfDoctrines = ['plasma_missile', 'audacity']

  for (const [doctrineId, effect] of Object.entries(unitActiveDoctrines)) {
    if (effect.remainingTurns <= 0) continue

    const doctrine = DOCTRINES[doctrineId]
    if (!doctrine) continue

    // Check for special doctrine behaviors
    if (defenseZeroDoctrines.includes(doctrineId)) {
      defenseZero = true
    }
    if (onesHurtSelfDoctrines.includes(doctrineId)) {
      onesHurtSelf = true
    }

    // Thorns - deal flat damage to attacker (karmic_retribution, retaliation)
    const thornEffect = doctrine.effects.find((e) => e.thornsDamage !== undefined)
    if (thornEffect?.thornsDamage) {
      thornsDamage = Math.max(thornsDamage, thornEffect.thornsDamage)
    }

    // INSPIRATION: Check for pre-calculated bonus dice from scalesWithEnemyTier
    if (doctrineId === 'inspiration') {
      const bonusEntry = unitActiveDoctrines[`${doctrineId}_bonus`] as any
      if (bonusEntry?.calculatedBonusDice) {
        bonusDice += bonusEntry.calculatedBonusDice
        continue // Skip normal processing for this doctrine
      }
    }

    for (const doctrineEffect of doctrine.effects) {
      if (doctrineEffect.target !== DoctrineTarget.SELF) continue
      const value = doctrineEffect.value || 0

      switch (doctrineEffect.type) {
        case DoctrineEffectType.POWER_MODIFIER:
          bonusDice += value
          // Check if this effect has the sixesGenerateExtraHits property
          if (doctrineEffect.sixesGenerateExtraHits) {
            sixesGenerateExtraHits = true
          }
          break

        case DoctrineEffectType.THRESHOLD_MODIFIER:
          thresholdMod += value
          break

        case DoctrineEffectType.NEGATE_HITS:
          // FRACTAL_INVOCATION: value >= 50 && <= 100 means percentage-based (50 = 50%)
          // IRON_BASTION: value = 99 (negate all) should work as flat negation when used standalone
          if (value >= 50 && value <= 100 && incomingHits !== undefined) {
            // Negate percentage of incoming hits, rounded up
            const percentageNegate = Math.ceil(incomingHits * (value / 100))
            negateHits += percentageNegate
          } else {
            // Standard flat hit negation (includes iron_bastion's 99 when no incomingHits context)
            negateHits += value
          }
          break

        case DoctrineEffectType.GUARANTEED_CRITICAL:
          if (value === 1) {
            guaranteedCritical = true
          } else if (value >= 2 && value <= 6) {
            // Lower critical threshold (e.g., 5 means 5+ is critical instead of 6+)
            criticalThresholdMod = Math.max(criticalThresholdMod, 6 - value)
          }
          break
      }
    }
  }

  return {
    bonusDice,
    sixesGenerateExtraHits,
    thresholdMod,
    negateHits,
    guaranteedCritical,
    criticalThresholdMod,
    defenseZero,
    onesHurtSelf,
    thornsDamage
  }
}

/**
 * Clear consumed self-buff doctrines from a unit after an attack.
 * This clears POWER_MODIFIER, THRESHOLD_MODIFIER, and GUARANTEED_CRITICAL effects.
 * NEGATE_HITS are cleared separately after defense.
 */
export function clearConsumedDoctrines(
  unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined,
  clearDefenseBuffs: boolean = false
): Record<string, ActiveStatusEffect> {
  if (!unitActiveDoctrines) {
    return {}
  }

  const remaining: Record<string, ActiveStatusEffect> = {}

  // Self-buff effect types that get consumed on attack
  const attackBuffTypes: DoctrineEffectType[] = [
    DoctrineEffectType.POWER_MODIFIER,
    DoctrineEffectType.THRESHOLD_MODIFIER,
    DoctrineEffectType.GUARANTEED_CRITICAL
  ]

  // Defense buff effect types that get consumed when taking damage
  const defenseBuffTypes: DoctrineEffectType[] = [DoctrineEffectType.NEGATE_HITS]

  for (const [doctrineId, effect] of Object.entries(unitActiveDoctrines)) {
    const doctrine = DOCTRINES[doctrineId]

    // If doctrine is not found or is not a self-buff, preserve it if it has remaining turns
    if (!doctrine) {
      if (effect.remainingTurns > 0) {
        remaining[doctrineId] = effect
      }
      continue
    }

    // Check if this is an attack self-buff - these get consumed after attack
    const isAttackSelfBuff =
      doctrine.effects.some((e) => attackBuffTypes.includes(e.type) && e.target === DoctrineTarget.SELF) &&
      !doctrine.effects.some((e) => e.target === DoctrineTarget.ENEMY || e.target === DoctrineTarget.ALL_ENEMIES)

    // Check if this is a defense self-buff - these get consumed after taking damage
    const isDefenseSelfBuff =
      doctrine.effects.some((e) => defenseBuffTypes.includes(e.type) && e.target === DoctrineTarget.SELF) &&
      !doctrine.effects.some((e) => e.target === DoctrineTarget.ENEMY || e.target === DoctrineTarget.ALL_ENEMIES)

    if (isAttackSelfBuff) {
      // Multi-turn attack buffs: decrement instead of removing
      if (effect.remainingTurns > 1) {
        remaining[doctrineId] = { ...effect, remainingTurns: effect.remainingTurns - 1 }
      }
      // Single-turn or expired: consumed (not added to remaining)
      continue
    }

    if (clearDefenseBuffs && isDefenseSelfBuff) {
      // Multi-turn defense buffs: decrement instead of removing
      if (effect.remainingTurns > 1) {
        remaining[doctrineId] = { ...effect, remainingTurns: effect.remainingTurns - 1 }
      }
      continue
    }

    // Other effects persist
    if (effect.remainingTurns > 0) {
      remaining[doctrineId] = effect
    }
  }

  return remaining
}

/**
 * Clear consumed defense buff doctrines from a unit after receiving damage.
 */
export function clearConsumedDefenseDoctrines(
  unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined
): Record<string, ActiveStatusEffect> {
  return clearConsumedDoctrines(unitActiveDoctrines, true)
}
