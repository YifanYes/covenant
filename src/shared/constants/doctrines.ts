import {
  DoctrineAttributeType,
  DoctrineEffectType,
  DoctrineTarget,
  StatusEffect,
  type DoctrineDefinition
} from '../types/doctrine.types'
import { CharacterClassName, MagicNature } from './classes'

export const MAX_EQUIPPED_DOCTRINES = 2

/** ID of the always-available, mana-free fallback move. */
export const BASIC_STRIKE_ID = 'basic_strike'

/**
 * Phase 2A: Pokémon-style move catalog. Each entry is either a damage move (has `power`/`damageType`)
 * routed through combat-formula, a side-effect move (buff/protect/thorns/cleanse) routed through
 * tactical-doctrine, or a damage move with a side-effect rider (status, debuff, recoil).
 *
 * Re-interpreted DoctrineEffect semantics in Phase 2A:
 *   POWER_MODIFIER target=SELF, value=N, duration=D → +N% ATK buff for D turns
 *   POWER_MODIFIER target=ENEMY, value=N, duration=D → −N% ATK debuff for D turns (negative value)
 *   THRESHOLD_MODIFIER target=SELF, value=N, duration=D → +N% DEF buff for D turns
 *   GUARANTEED_CRITICAL target=SELF, value=1 → 100% crit chance for the next damage move
 *   GUARANTEED_CRITICAL target=SELF, value=N (>=2) → +N% crit chance for the next damage move
 *   NEGATE_HITS target=SELF, value>=1 → Protect (full block) for 1 turn
 *   NEGATE_HITS target=SELF, value=0, thornsDamage=D → reflect D damage for 2 turns
 *   APPLY_STATUS → applies StatusEffect to target (PURIFIED, IMMOBILIZED, WEAKENED, etc.)
 *   HEAL target=SELF, value=0 → cleanse own debuffs (nullify)
 */
export const DOCTRINES: Record<string, DoctrineDefinition> = {
  // ═══════════════════════════════════════
  // UNIVERSAL — always-available fallback
  // ═══════════════════════════════════════
  basic_strike: {
    id: 'basic_strike',
    nameKey: 'doctrines.basic_strike.name',
    descriptionKey: 'doctrines.basic_strike.description',
    flavorTextKey: 'doctrines.basic_strike.flavor',
    className: 'universal',
    magicNature: 'universal',
    attribute: DoctrineAttributeType.METAL,
    tier: 1,
    manaCost: 0,
    isUltimate: false,
    targeting: 'single',
    effects: [],
    power: 35,
    damageType: 'PHYSICAL'
  },

  // ═══════════════════════════════════════
  // TEMPLAR — TIER 1
  // ═══════════════════════════════════════
  truth_blade: {
    id: 'truth_blade',
    nameKey: 'doctrines.truth_blade.name',
    descriptionKey: 'doctrines.truth_blade.description',
    flavorTextKey: 'doctrines.truth_blade.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.LIGHT,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.PURIFIED,
        duration: 2
      }
    ],
    power: 30,
    damageType: 'MAGIC'
  },
  miraculous_protection: {
    id: 'miraculous_protection',
    nameKey: 'doctrines.miraculous_protection.name',
    descriptionKey: 'doctrines.miraculous_protection.description',
    flavorTextKey: 'doctrines.miraculous_protection.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.LIGHT,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 1,
        duration: 1
      }
    ]
  },
  shoulder_charge: {
    id: 'shoulder_charge',
    nameKey: 'doctrines.shoulder_charge.name',
    descriptionKey: 'doctrines.shoulder_charge.description',
    flavorTextKey: 'doctrines.shoulder_charge.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.EARTH,
    tier: 1,
    manaCost: 2,
    isUltimate: false,
    targeting: 'single',
    effects: [],
    power: 50,
    damageType: 'PHYSICAL'
  },
  reckless_strike: {
    id: 'reckless_strike',
    nameKey: 'doctrines.reckless_strike.name',
    descriptionKey: 'doctrines.reckless_strike.description',
    flavorTextKey: 'doctrines.reckless_strike.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.METAL,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [],
    power: 70,
    damageType: 'PHYSICAL',
    recoilPercent: 25
  },

  // ═══════════════════════════════════════
  // TEMPLAR — TIER 2
  // ═══════════════════════════════════════
  light_shield: {
    id: 'light_shield',
    nameKey: 'doctrines.light_shield.name',
    descriptionKey: 'doctrines.light_shield.description',
    flavorTextKey: 'doctrines.light_shield.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.LIGHT,
    tier: 2,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.THRESHOLD_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 50,
        duration: 2
      }
    ]
  },
  precise_strike: {
    id: 'precise_strike',
    nameKey: 'doctrines.precise_strike.name',
    descriptionKey: 'doctrines.precise_strike.description',
    flavorTextKey: 'doctrines.precise_strike.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.EARTH,
    tier: 2,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.GUARANTEED_CRITICAL,
        target: DoctrineTarget.SELF,
        value: 50,
        duration: 1
      }
    ],
    power: 50,
    damageType: 'PHYSICAL'
  },
  audacity: {
    id: 'audacity',
    nameKey: 'doctrines.audacity.name',
    descriptionKey: 'doctrines.audacity.description',
    flavorTextKey: 'doctrines.audacity.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.METAL,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 50,
        duration: 2
      }
    ]
  },

  // ═══════════════════════════════════════
  // TEMPLAR — TIER 3
  // ═══════════════════════════════════════
  iron_bastion: {
    id: 'iron_bastion',
    nameKey: 'doctrines.iron_bastion.name',
    descriptionKey: 'doctrines.iron_bastion.description',
    flavorTextKey: 'doctrines.iron_bastion.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.WATER,
    tier: 3,
    manaCost: 6,
    isUltimate: true,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 99,
        duration: 1
      }
    ]
  },
  kings_sword: {
    id: 'kings_sword',
    nameKey: 'doctrines.kings_sword.name',
    descriptionKey: 'doctrines.kings_sword.description',
    flavorTextKey: 'doctrines.kings_sword.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.LIGHT,
    tier: 3,
    manaCost: 7,
    isUltimate: true,
    targeting: 'single',
    effects: [],
    power: 90,
    damageType: 'PHYSICAL'
  },
  wrath_avatar: {
    id: 'wrath_avatar',
    nameKey: 'doctrines.wrath_avatar.name',
    descriptionKey: 'doctrines.wrath_avatar.description',
    flavorTextKey: 'doctrines.wrath_avatar.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.LIGHTNING,
    tier: 3,
    manaCost: 8,
    isUltimate: true,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.GUARANTEED_CRITICAL,
        target: DoctrineTarget.SELF,
        value: 1,
        duration: 1
      }
    ],
    power: 100,
    damageType: 'PHYSICAL'
  },
  karmic_retribution: {
    id: 'karmic_retribution',
    nameKey: 'doctrines.karmic_retribution.name',
    descriptionKey: 'doctrines.karmic_retribution.description',
    flavorTextKey: 'doctrines.karmic_retribution.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.DARKNESS,
    tier: 3,
    manaCost: 8,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 0,
        duration: 2,
        thornsDamage: 10
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD — TIER 1
  // ═══════════════════════════════════════
  plasma_missile: {
    id: 'plasma_missile',
    nameKey: 'doctrines.plasma_missile.name',
    descriptionKey: 'doctrines.plasma_missile.description',
    flavorTextKey: 'doctrines.plasma_missile.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.FIRE,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [],
    power: 50,
    damageType: 'MAGIC'
  },
  ice_lance: {
    id: 'ice_lance',
    nameKey: 'doctrines.ice_lance.name',
    descriptionKey: 'doctrines.ice_lance.description',
    flavorTextKey: 'doctrines.ice_lance.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.ICE,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.IMMOBILIZED,
        duration: 1
      }
    ],
    power: 40,
    damageType: 'MAGIC'
  },
  mana_barrier: {
    id: 'mana_barrier',
    nameKey: 'doctrines.mana_barrier.name',
    descriptionKey: 'doctrines.mana_barrier.description',
    flavorTextKey: 'doctrines.mana_barrier.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.LIGHT,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 1,
        duration: 1
      }
    ]
  },
  frost_bite: {
    id: 'frost_bite',
    nameKey: 'doctrines.frost_bite.name',
    descriptionKey: 'doctrines.frost_bite.description',
    flavorTextKey: 'doctrines.frost_bite.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.ICE,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.ENEMY,
        value: -30,
        duration: 1,
        debuffType: 'attack'
      }
    ],
    power: 30,
    damageType: 'MAGIC'
  },

  // ═══════════════════════════════════════
  // HERALD — TIER 2
  // ═══════════════════════════════════════
  nullify: {
    id: 'nullify',
    nameKey: 'doctrines.nullify.name',
    descriptionKey: 'doctrines.nullify.description',
    flavorTextKey: 'doctrines.nullify.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.WATER,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.HEAL,
        target: DoctrineTarget.SELF,
        value: 0
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD — TIER 3
  // ═══════════════════════════════════════
  inspiration: {
    id: 'inspiration',
    nameKey: 'doctrines.inspiration.name',
    descriptionKey: 'doctrines.inspiration.description',
    flavorTextKey: 'doctrines.inspiration.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.MIND,
    tier: 3,
    manaCost: 6,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 25,
        duration: 2,
        scalesWithEnemyTier: true
      }
    ]
  },
  stellar_collapse: {
    id: 'stellar_collapse',
    nameKey: 'doctrines.stellar_collapse.name',
    descriptionKey: 'doctrines.stellar_collapse.description',
    flavorTextKey: 'doctrines.stellar_collapse.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.DARKNESS,
    tier: 3,
    manaCost: 10,
    isUltimate: true,
    targeting: 'single',
    effects: [],
    power: 110,
    damageType: 'MAGIC'
  },
  retaliation: {
    id: 'retaliation',
    nameKey: 'doctrines.retaliation.name',
    descriptionKey: 'doctrines.retaliation.description',
    flavorTextKey: 'doctrines.retaliation.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.DARKNESS,
    tier: 3,
    manaCost: 8,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 0,
        duration: 2,
        thornsDamage: 10
      }
    ]
  }
}

export function getDoctrineById(id: string): DoctrineDefinition | undefined {
  return DOCTRINES[id]
}

export function getDoctrinesForClass(className: CharacterClassName, maxTier: number): DoctrineDefinition[] {
  return Object.values(DOCTRINES).filter((d) => d.className === className && d.tier <= maxTier)
}

export function getAvailableDoctrines(
  className: CharacterClassName,
  tier: number,
  magicNature?: MagicNature
): DoctrineDefinition[] {
  return Object.values(DOCTRINES).filter((d) => {
    if (d.id === BASIC_STRIKE_ID) return false
    if (d.className === 'universal') return false
    const matchesClass = d.className === className
    const matchesTier = d.tier <= tier
    const matchesNature = !magicNature || d.magicNature === magicNature || d.magicNature === 'universal'
    return matchesClass && matchesTier && matchesNature
  })
}

/** Whether the move resolves damage via combat-formula. */
export function isDamageMove(doctrine: DoctrineDefinition): boolean {
  return doctrine.power !== undefined && doctrine.damageType !== undefined
}
