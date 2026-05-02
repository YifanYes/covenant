import {
  DoctrineAttributeType,
  DoctrineEffectType,
  DoctrineTarget,
  StatusEffect,
  type DoctrineDefinition
} from '../types/doctrine.types'
import { CharacterClassName, MagicNature } from './classes'


export const MAX_EQUIPPED_DOCTRINES = 2

/** Effect types that qualify a doctrine as a self-buff (no targeting required) */
export const SELF_BUFF_EFFECT_TYPES: DoctrineEffectType[] = [
  DoctrineEffectType.POWER_MODIFIER,
  DoctrineEffectType.THRESHOLD_MODIFIER,
  DoctrineEffectType.NEGATE_HITS,
  DoctrineEffectType.GUARANTEED_CRITICAL
]

/** Doctrines that are self-buffs but don't match the standard effect-type + SELF target pattern */
export const SPECIAL_SELF_BUFF_DOCTRINES = ['karmic_retribution', 'nullify', 'retaliation']

export const DOCTRINES: Record<string, DoctrineDefinition> = {
  // ═══════════════════════════════════════
  // TEMPLAR - TIER 1 - FORM
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
        duration: 2 // Apply PURIFIED for 2 turns (holy damage, affects demons)
      }
    ]
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
        value: 1 // Negate 1 hit
      }
    ]
  },

  // ═══════════════════════════════════════
  // TEMPLAR - TIER 1 - VOID
  // ═══════════════════════════════════════
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
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 1
      }
    ]
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
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 2 // +2 power dice, defense becomes 0
      }
    ]
  },

  // ═══════════════════════════════════════
  // TEMPLAR - TIER 2 - FORM
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
        value: -1,
        duration: 1
      }
    ]
  },

  // ═══════════════════════════════════════
  // TEMPLAR - TIER 2 - VOID
  // ═══════════════════════════════════════
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
        value: 5
      }
    ]
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
        value: 2
      }
    ]
  },

  // ═══════════════════════════════════════
  // TEMPLAR - TIER 3 - FORM
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
        value: 99
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
    effects: [
      {
        type: DoctrineEffectType.THRESHOLD_MODIFIER,
        target: DoctrineTarget.SELF,
        value: -2
      }
    ]
  },

  // ═══════════════════════════════════════
  // TEMPLAR - TIER 3 - VOID
  // ═══════════════════════════════════════
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
        value: 1
      }
    ]
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
        thornsDamage: 2
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD - TIER 1 - VOID
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
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 4
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD - TIER 2 - FORM
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
  // HERALD - TIER 3 - FORM
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
        value: 4,
        scalesWithEnemyTier: true
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD - TIER 3 - VOID
  // ═══════════════════════════════════════
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
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 10,
        sixesGenerateExtraHits: 1
      }
    ]
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
        thornsDamage: 2
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD - TIER 1 - FORM
  // ═══════════════════════════════════════
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
    ]
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
        value: 1 // Negate first magic hit
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD - TIER 1 - VOID
  // ═══════════════════════════════════════
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
        value: -2, // Enemy -2 power dice
        duration: 1,
        debuffType: 'attack'
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
    const matchesClass = d.className === className
    const matchesTier = d.tier <= tier
    const matchesNature = !magicNature || d.magicNature === magicNature
    return matchesClass && matchesTier && matchesNature
  })
}
