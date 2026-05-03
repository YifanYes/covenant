import { DOCTRINES } from '@shared/constants/doctrines'
import { DoctrineEffectType, DoctrineTarget, type ActiveStatusEffect } from '@shared/types/doctrine.types'

/** Doctrines that set defense to zero when active */
const DEFENSE_ZERO_DOCTRINES = ['reckless_strike', 'audacity'] as const

/** Doctrines where rolling 1s hurts the caster */
const ONES_HURT_SELF_DOCTRINES = ['plasma_missile', 'audacity'] as const

/** Doctrines that provide thorns damage */
const THORNS_DOCTRINES = ['karmic_retribution', 'retaliation'] as const

/** Doctrine that provides dynamic bonus dice based on context */
const DYNAMIC_BONUS_DOCTRINE = 'inspiration' as const

export class BuffManagementService {
  /**
   * Get all active self-buff modifiers from doctrines on a unit.
   * Returns bonus dice, threshold modifiers, negate hits, and critical modifiers.
   */
  getActiveDoctrineBuffs(
    unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined,
    incomingHits?: number
  ): {
    bonusDice: number
    sixesGenerateExtraHits: boolean
    thresholdMod: number
    negateHits: number
    guaranteedCritical: boolean
    criticalThresholdMod: number
    defenseZero: boolean
    onesHurtSelf: boolean
    thornsDamage: number
  } {
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

    for (const [doctrineId, effect] of Object.entries(unitActiveDoctrines)) {
      if (effect.remainingTurns <= 0) continue

      const doctrine = DOCTRINES[doctrineId]
      if (!doctrine) continue

      if ((DEFENSE_ZERO_DOCTRINES as readonly string[]).includes(doctrineId)) {
        defenseZero = true
      }
      if ((ONES_HURT_SELF_DOCTRINES as readonly string[]).includes(doctrineId)) {
        onesHurtSelf = true
      }

      if ((THORNS_DOCTRINES as readonly string[]).includes(doctrineId)) {
        const thornEffect = doctrine.effects.find((e) => e.thornsDamage !== undefined)
        if (thornEffect?.thornsDamage) {
          thornsDamage = Math.max(thornsDamage, thornEffect.thornsDamage)
        }
      }

      if (doctrineId === DYNAMIC_BONUS_DOCTRINE) {
        const bonusEntry = unitActiveDoctrines[`${doctrineId}_bonus`] as unknown as { calculatedBonusDice?: number }
        if (bonusEntry?.calculatedBonusDice) {
          bonusDice += bonusEntry.calculatedBonusDice
          continue
        }
      }

      for (const doctrineEffect of doctrine.effects) {
        if (doctrineEffect.target !== DoctrineTarget.SELF) continue
        const value = doctrineEffect.value || 0

        switch (doctrineEffect.type) {
          case DoctrineEffectType.POWER_MODIFIER:
            bonusDice += value
            if (doctrineEffect.sixesGenerateExtraHits) {
              sixesGenerateExtraHits = true
            }
            break

          case DoctrineEffectType.THRESHOLD_MODIFIER:
            thresholdMod += value
            break

          case DoctrineEffectType.NEGATE_HITS:
            if (value >= 50 && value <= 100 && incomingHits !== undefined) {
              const percentageNegate = Math.ceil(incomingHits * (value / 100))
              negateHits += percentageNegate
            } else {
              negateHits += value
            }
            break

          case DoctrineEffectType.GUARANTEED_CRITICAL:
            if (value === 1) {
              guaranteedCritical = true
            } else if (value >= 2 && value <= 6) {
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
  clearConsumedDoctrines(
    unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined,
    clearDefenseBuffs: boolean = false
  ): Record<string, ActiveStatusEffect> {
    if (!unitActiveDoctrines) {
      return {}
    }

    const remaining: Record<string, ActiveStatusEffect> = {}

    const attackBuffTypes: DoctrineEffectType[] = [
      DoctrineEffectType.POWER_MODIFIER,
      DoctrineEffectType.THRESHOLD_MODIFIER,
      DoctrineEffectType.GUARANTEED_CRITICAL
    ]

    const defenseBuffTypes: DoctrineEffectType[] = [DoctrineEffectType.NEGATE_HITS]

    for (const [doctrineId, effect] of Object.entries(unitActiveDoctrines)) {
      const doctrine = DOCTRINES[doctrineId]

      if (!doctrine) {
        if (effect.remainingTurns > 0) {
          remaining[doctrineId] = effect
        }
        continue
      }

      const isAttackSelfBuff =
        doctrine.effects.some((e) => attackBuffTypes.includes(e.type) && e.target === DoctrineTarget.SELF) &&
        !doctrine.effects.some((e) => e.target === DoctrineTarget.ENEMY || e.target === DoctrineTarget.ALL_ENEMIES)

      const isDefenseSelfBuff =
        doctrine.effects.some((e) => defenseBuffTypes.includes(e.type) && e.target === DoctrineTarget.SELF) &&
        !doctrine.effects.some((e) => e.target === DoctrineTarget.ENEMY || e.target === DoctrineTarget.ALL_ENEMIES)

      if (isAttackSelfBuff) {
        continue
      }

      if (clearDefenseBuffs && isDefenseSelfBuff) {
        continue
      }

      if (effect.remainingTurns > 0) {
        remaining[doctrineId] = effect
      }
    }

    return remaining
  }

  /**
   * Clear consumed defense buff doctrines from a unit after receiving damage.
   */
  clearConsumedDefenseDoctrines(
    unitActiveDoctrines: Record<string, ActiveStatusEffect> | undefined
  ): Record<string, ActiveStatusEffect> {
    return this.clearConsumedDoctrines(unitActiveDoctrines, true)
  }
}
