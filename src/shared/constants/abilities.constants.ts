import { CharacterClassName, MagicNature } from '@shared/constants/classes.constants'
import {
  AbilityAttributeType,
  AbilityEffectType,
  AbilityTarget,
  StatusEffect,
  type AbilityDefinition
} from '@shared/types/ability.types'

export const MAX_EQUIPPED_ABILITIES = 2

/** ID of the always-available, mana-free fallback move. */
export const BASIC_STRIKE_ID = 'basic_strike'

/**
 * Phase 2A: Pokémon-style move catalog. Each entry is either a damage move (has `power`/`damageType`)
 * routed through combat-formula, a side-effect move (buff/protect/thorns/cleanse) routed through
 * tactical-ability, or a damage move with a side-effect rider (status, debuff, recoil).
 *
 * Re-interpreted AbilityEffect semantics in Phase 2A:
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
export const ABILITIES: Record<string, AbilityDefinition> = {
  // ═══════════════════════════════════════
  // UNIVERSAL — always-available fallback
  // ═══════════════════════════════════════
  basic_strike: {
    id: 'basic_strike',
    nameKey: 'abilities.basic_strike.name',
    descriptionKey: 'abilities.basic_strike.description',
    flavorTextKey: 'abilities.basic_strike.flavor',
    className: 'universal',
    magicNature: 'universal',
    attribute: AbilityAttributeType.METAL,
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
    nameKey: 'abilities.truth_blade.name',
    descriptionKey: 'abilities.truth_blade.description',
    flavorTextKey: 'abilities.truth_blade.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: AbilityAttributeType.LIGHT,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.APPLY_STATUS,
        target: AbilityTarget.ENEMY,
        statusEffect: StatusEffect.PURIFIED,
        duration: 2
      }
    ],
    power: 30,
    damageType: 'MAGIC'
  },
  miraculous_protection: {
    id: 'miraculous_protection',
    nameKey: 'abilities.miraculous_protection.name',
    descriptionKey: 'abilities.miraculous_protection.description',
    flavorTextKey: 'abilities.miraculous_protection.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: AbilityAttributeType.LIGHT,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.NEGATE_HITS,
        target: AbilityTarget.SELF,
        value: 1,
        duration: 1
      }
    ]
  },
  shoulder_charge: {
    id: 'shoulder_charge',
    nameKey: 'abilities.shoulder_charge.name',
    descriptionKey: 'abilities.shoulder_charge.description',
    flavorTextKey: 'abilities.shoulder_charge.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: AbilityAttributeType.EARTH,
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
    nameKey: 'abilities.reckless_strike.name',
    descriptionKey: 'abilities.reckless_strike.description',
    flavorTextKey: 'abilities.reckless_strike.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: AbilityAttributeType.METAL,
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
    nameKey: 'abilities.light_shield.name',
    descriptionKey: 'abilities.light_shield.description',
    flavorTextKey: 'abilities.light_shield.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: AbilityAttributeType.LIGHT,
    tier: 2,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.THRESHOLD_MODIFIER,
        target: AbilityTarget.SELF,
        value: 50,
        duration: 2
      }
    ]
  },
  precise_strike: {
    id: 'precise_strike',
    nameKey: 'abilities.precise_strike.name',
    descriptionKey: 'abilities.precise_strike.description',
    flavorTextKey: 'abilities.precise_strike.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: AbilityAttributeType.EARTH,
    tier: 2,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.GUARANTEED_CRITICAL,
        target: AbilityTarget.SELF,
        value: 50,
        duration: 1
      }
    ],
    power: 50,
    damageType: 'PHYSICAL'
  },
  audacity: {
    id: 'audacity',
    nameKey: 'abilities.audacity.name',
    descriptionKey: 'abilities.audacity.description',
    flavorTextKey: 'abilities.audacity.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: AbilityAttributeType.METAL,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.POWER_MODIFIER,
        target: AbilityTarget.SELF,
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
    nameKey: 'abilities.iron_bastion.name',
    descriptionKey: 'abilities.iron_bastion.description',
    flavorTextKey: 'abilities.iron_bastion.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: AbilityAttributeType.WATER,
    tier: 3,
    manaCost: 6,
    isUltimate: true,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.NEGATE_HITS,
        target: AbilityTarget.SELF,
        value: 99,
        duration: 1
      }
    ]
  },
  kings_sword: {
    id: 'kings_sword',
    nameKey: 'abilities.kings_sword.name',
    descriptionKey: 'abilities.kings_sword.description',
    flavorTextKey: 'abilities.kings_sword.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: AbilityAttributeType.LIGHT,
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
    nameKey: 'abilities.wrath_avatar.name',
    descriptionKey: 'abilities.wrath_avatar.description',
    flavorTextKey: 'abilities.wrath_avatar.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: AbilityAttributeType.LIGHTNING,
    tier: 3,
    manaCost: 8,
    isUltimate: true,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.GUARANTEED_CRITICAL,
        target: AbilityTarget.SELF,
        value: 1,
        duration: 1
      }
    ],
    power: 100,
    damageType: 'PHYSICAL'
  },
  karmic_retribution: {
    id: 'karmic_retribution',
    nameKey: 'abilities.karmic_retribution.name',
    descriptionKey: 'abilities.karmic_retribution.description',
    flavorTextKey: 'abilities.karmic_retribution.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: AbilityAttributeType.DARKNESS,
    tier: 3,
    manaCost: 8,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.NEGATE_HITS,
        target: AbilityTarget.SELF,
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
    nameKey: 'abilities.plasma_missile.name',
    descriptionKey: 'abilities.plasma_missile.description',
    flavorTextKey: 'abilities.plasma_missile.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: AbilityAttributeType.FIRE,
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
    nameKey: 'abilities.ice_lance.name',
    descriptionKey: 'abilities.ice_lance.description',
    flavorTextKey: 'abilities.ice_lance.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: AbilityAttributeType.ICE,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.APPLY_STATUS,
        target: AbilityTarget.ENEMY,
        statusEffect: StatusEffect.IMMOBILIZED,
        duration: 1
      }
    ],
    power: 40,
    damageType: 'MAGIC'
  },
  mana_barrier: {
    id: 'mana_barrier',
    nameKey: 'abilities.mana_barrier.name',
    descriptionKey: 'abilities.mana_barrier.description',
    flavorTextKey: 'abilities.mana_barrier.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: AbilityAttributeType.LIGHT,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.NEGATE_HITS,
        target: AbilityTarget.SELF,
        value: 1,
        duration: 1
      }
    ]
  },
  frost_bite: {
    id: 'frost_bite',
    nameKey: 'abilities.frost_bite.name',
    descriptionKey: 'abilities.frost_bite.description',
    flavorTextKey: 'abilities.frost_bite.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: AbilityAttributeType.ICE,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.POWER_MODIFIER,
        target: AbilityTarget.ENEMY,
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
    nameKey: 'abilities.nullify.name',
    descriptionKey: 'abilities.nullify.description',
    flavorTextKey: 'abilities.nullify.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: AbilityAttributeType.WATER,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.HEAL,
        target: AbilityTarget.SELF,
        value: 0
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD — TIER 3
  // ═══════════════════════════════════════
  inspiration: {
    id: 'inspiration',
    nameKey: 'abilities.inspiration.name',
    descriptionKey: 'abilities.inspiration.description',
    flavorTextKey: 'abilities.inspiration.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: AbilityAttributeType.MIND,
    tier: 3,
    manaCost: 6,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.POWER_MODIFIER,
        target: AbilityTarget.SELF,
        value: 25,
        duration: 2,
        scalesWithEnemyTier: true
      }
    ]
  },
  stellar_collapse: {
    id: 'stellar_collapse',
    nameKey: 'abilities.stellar_collapse.name',
    descriptionKey: 'abilities.stellar_collapse.description',
    flavorTextKey: 'abilities.stellar_collapse.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: AbilityAttributeType.DARKNESS,
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
    nameKey: 'abilities.retaliation.name',
    descriptionKey: 'abilities.retaliation.description',
    flavorTextKey: 'abilities.retaliation.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: AbilityAttributeType.DARKNESS,
    tier: 3,
    manaCost: 8,
    isUltimate: false,
    targeting: 'single',
    effects: [
      {
        type: AbilityEffectType.NEGATE_HITS,
        target: AbilityTarget.SELF,
        value: 0,
        duration: 2,
        thornsDamage: 10
      }
    ]
  }
}

export function getAbilityById(id: string): AbilityDefinition | undefined {
  return ABILITIES[id]
}

export function getAbilitiesForClass(className: CharacterClassName, maxTier: number): AbilityDefinition[] {
  return Object.values(ABILITIES).filter((d) => d.className === className && d.tier <= maxTier)
}

export function getAvailableAbilities(
  className: CharacterClassName,
  tier: number,
  magicNature?: MagicNature
): AbilityDefinition[] {
  return Object.values(ABILITIES).filter((d) => {
    if (d.id === BASIC_STRIKE_ID) return false
    if (d.className === 'universal') return false
    const matchesClass = d.className === className
    const matchesTier = d.tier <= tier
    const matchesNature = !magicNature || d.magicNature === magicNature || d.magicNature === 'universal'
    return matchesClass && matchesTier && matchesNature
  })
}

/** Whether the move resolves damage via combat-formula. */
export function isDamageMove(ability: AbilityDefinition): boolean {
  return ability.power !== undefined && ability.damageType !== undefined
}
