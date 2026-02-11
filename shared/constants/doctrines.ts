import {
  DoctrineAttributeType,
  DoctrineEffectType,
  DoctrineTarget,
  StatusEffect,
  type DoctrineDefinition
} from '../types/doctrine.types'
import { CharacterClassName, MagicNature } from './classes'
import { AoEPatternType } from './aoe-patterns'

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
    aoePattern: AoEPatternType.SINGLE,
    castRange: 1,
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
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 1 // Negate 1 hit
      }
    ]
  },
  shield_bash: {
    id: 'shield_bash',
    nameKey: 'doctrines.shield_bash.name',
    descriptionKey: 'doctrines.shield_bash.description',
    flavorTextKey: 'doctrines.shield_bash.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.METAL,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 1,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.ENEMY,
        value: -1, // Enemy -1 defense die
        duration: 1,
        debuffType: 'defense'
        // Also pushes enemy 1 tile (push not yet implemented in effect system)
      }
    ]
  },
  // igneous_cut moved from Void to Form — now melee strike + burn
  igneous_cut: {
    id: 'igneous_cut',
    nameKey: 'doctrines.igneous_cut.name',
    descriptionKey: 'doctrines.igneous_cut.description',
    flavorTextKey: 'doctrines.igneous_cut.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.FIRE,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 1,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 1 // +1 power die
      },
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.BURNING,
        duration: 1 // Apply BURNING for 1 turn
      }
    ]
  },

  // ═══════════════════════════════════════
  // TEMPLAR - TIER 1 - VOID
  // ═══════════════════════════════════════
  entropic_acceleration: {
    id: 'entropic_acceleration',
    nameKey: 'doctrines.entropic_acceleration.name',
    descriptionKey: 'doctrines.entropic_acceleration.description',
    flavorTextKey: 'doctrines.entropic_acceleration.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.FIRE,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 1,
    effects: [
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.BURNING,
        duration: 2 // Apply BURNING for 2 turns
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
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 2 // +2 power dice, defense becomes 0
      }
    ]
  },
  tidal_strike: {
    id: 'tidal_strike',
    nameKey: 'doctrines.tidal_strike.name',
    descriptionKey: 'doctrines.tidal_strike.description',
    flavorTextKey: 'doctrines.tidal_strike.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.WATER,
    tier: 1,
    manaCost: 2,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 1,
    effects: [
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ENEMY,
        value: 1 // 1 guaranteed hit (ignores defense)
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
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 1 // +1 power die. Also pushes enemy 1 tile (push not yet implemented)
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
    effects: [
      {
        type: DoctrineEffectType.THRESHOLD_MODIFIER,
        target: DoctrineTarget.SELF,
        value: -1, // Defense threshold reduced by 1
        duration: 1
      }
    ]
  },
  righteous_charge: {
    id: 'righteous_charge',
    nameKey: 'doctrines.righteous_charge.name',
    descriptionKey: 'doctrines.righteous_charge.description',
    flavorTextKey: 'doctrines.righteous_charge.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.LIGHTNING,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 2
      },
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.STUNNED,
        duration: 1
      }
    ]
  },
  unbreakable_formation: {
    id: 'unbreakable_formation',
    nameKey: 'doctrines.unbreakable_formation.name',
    descriptionKey: 'doctrines.unbreakable_formation.description',
    flavorTextKey: 'doctrines.unbreakable_formation.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.EARTH,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 1, // Reduce damage by 1
        duration: 2
      }
    ]
  },
  templar_burst: {
    id: 'templar_burst',
    nameKey: 'doctrines.templar_burst.name',
    descriptionKey: 'doctrines.templar_burst.description',
    flavorTextKey: 'doctrines.templar_burst.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.FIRE,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 2 // +2 power dice
      },
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.BURNING,
        duration: 2 // Apply BURNING for 2 turns on hit
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
    effects: [
      {
        type: DoctrineEffectType.GUARANTEED_CRITICAL,
        target: DoctrineTarget.SELF,
        value: 5 // 5+ counts as critical
      }
    ]
  },
  battle_fervor: {
    id: 'battle_fervor',
    nameKey: 'doctrines.battle_fervor.name',
    descriptionKey: 'doctrines.battle_fervor.description',
    flavorTextKey: 'doctrines.battle_fervor.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.DARKNESS,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.HEAL,
        target: DoctrineTarget.SELF,
        value: 3 // Heal up to 3 based on hits
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
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 2 // +2 power, defense 0, 1s hurt
      }
    ]
  },
  fan_cut: {
    id: 'fan_cut',
    nameKey: 'doctrines.fan_cut.name',
    descriptionKey: 'doctrines.fan_cut.description',
    flavorTextKey: 'doctrines.fan_cut.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.AIR,
    tier: 2,
    manaCost: 5,
    isUltimate: false,
    aoePattern: AoEPatternType.CROSS,
    castRange: 1,
    effects: [
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ALL_ENEMIES,
        value: 2 // Attack up to 2 enemies. Also pushes (push not yet implemented)
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
    // Ultimate: requires sacrifice (1 Wound) to activate
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 99 // Negate all hits this turn
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
    effects: [
      {
        type: DoctrineEffectType.THRESHOLD_MODIFIER,
        target: DoctrineTarget.SELF,
        value: -2 // Attack threshold reduced to 2+
      }
    ]
  },
  law_hammer: {
    id: 'law_hammer',
    nameKey: 'doctrines.law_hammer.name',
    descriptionKey: 'doctrines.law_hammer.description',
    flavorTextKey: 'doctrines.law_hammer.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.METAL,
    tier: 3,
    manaCost: 6,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 2
      },
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.STUNNED,
        duration: 1
      }
    ]
  },
  war_pyre: {
    id: 'war_pyre',
    nameKey: 'doctrines.war_pyre.name',
    descriptionKey: 'doctrines.war_pyre.description',
    flavorTextKey: 'doctrines.war_pyre.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.FIRE,
    tier: 3,
    manaCost: 6,
    isUltimate: false,
    aoePattern: AoEPatternType.CROSS,
    castRange: 2,
    // Area fire DOT zone — approximated as AoE BURNING application
    effects: [
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ALL_ENEMIES,
        statusEffect: StatusEffect.BURNING,
        duration: 2 // BURNING for 2 turns to all enemies in area
      }
    ]
  },

  // ═══════════════════════════════════════
  // TEMPLAR - TIER 3 - VOID
  // ═══════════════════════════════════════
  disruption_storm: {
    id: 'disruption_storm',
    nameKey: 'doctrines.disruption_storm.name',
    descriptionKey: 'doctrines.disruption_storm.description',
    flavorTextKey: 'doctrines.disruption_storm.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.AIR,
    tier: 3,
    manaCost: 6,
    isUltimate: true,
    aoePattern: AoEPatternType.CROSS,
    castRange: 2,
    // Ultimate: requires sacrifice (1 Wound) to activate
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 4 // 4 power dice split between enemies
      }
    ]
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
    // Ultimate: requires sacrifice (1 Wound) to activate
    effects: [
      {
        type: DoctrineEffectType.GUARANTEED_CRITICAL,
        target: DoctrineTarget.SELF,
        value: 1 // All attacks are criticals
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
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS, // Using NEGATE_HITS to make it a valid self-buff
        target: DoctrineTarget.SELF,
        value: 0, // No hit negation, but triggers thorns
        duration: 2,
        thornsDamage: 2 // Custom field: deal 2 damage to attackers when hit
      }
    ]
  },
  summary_execution: {
    id: 'summary_execution',
    nameKey: 'doctrines.summary_execution.name',
    descriptionKey: 'doctrines.summary_execution.description',
    flavorTextKey: 'doctrines.summary_execution.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.METAL,
    tier: 3,
    manaCost: 7,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 1,
    effects: [
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ENEMY,
        value: 99, // Instant kill if enemy below 25% health
        healthThreshold: 0.25 // Execute threshold: kills if currentHealth < maxHealth * 0.25
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
    aoePattern: AoEPatternType.SINGLE,
    castRange: 1,
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
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 1 // Negate first magic hit
      }
    ]
  },
  arcane_push: {
    id: 'arcane_push',
    nameKey: 'doctrines.arcane_push.name',
    descriptionKey: 'doctrines.arcane_push.description',
    flavorTextKey: 'doctrines.arcane_push.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.AIR,
    tier: 1,
    manaCost: 2,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 3,
    // Pushes enemy 3 tiles away — approximated as targeted DIRECT_DAMAGE 0 (no damage, displacement only)
    effects: [
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ENEMY,
        value: 0 // Push only, no damage (push not yet implemented in effect system)
      }
    ]
  },
  unerring_dart: {
    id: 'unerring_dart',
    nameKey: 'doctrines.unerring_dart.name',
    descriptionKey: 'doctrines.unerring_dart.description',
    flavorTextKey: 'doctrines.unerring_dart.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.LIGHT,
    tier: 1,
    manaCost: 7,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 4,
    // Destroys non-boss demon instantly — approximated as massive direct damage
    effects: [
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ENEMY,
        value: 99 // Destroy non-boss demon (instant kill)
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
    aoePattern: AoEPatternType.SINGLE,
    castRange: 3,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.ENEMY,
        value: -2, // Enemy -2 power dice
        duration: 1,
        debuffType: 'attack'
      }
    ]
  },
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
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 4 // +4 power dice (1s hurt self)
      }
    ]
  },
  lightning_burst: {
    id: 'lightning_burst',
    nameKey: 'doctrines.lightning_burst.name',
    descriptionKey: 'doctrines.lightning_burst.description',
    flavorTextKey: 'doctrines.lightning_burst.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.LIGHTNING,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 2 // +2 power to next attack
      }
    ]
  },
  shadow_step: {
    id: 'shadow_step',
    nameKey: 'doctrines.shadow_step.name',
    descriptionKey: 'doctrines.shadow_step.description',
    flavorTextKey: 'doctrines.shadow_step.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.DARKNESS,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    // Also teleports caster to target (teleport not yet implemented in effect system)
    effects: [
      {
        type: DoctrineEffectType.GUARANTEED_CRITICAL,
        target: DoctrineTarget.SELF,
        value: 1 // Next attack ignores defense
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD - TIER 2 - FORM
  // ═══════════════════════════════════════
  oracle_eye: {
    id: 'oracle_eye',
    nameKey: 'doctrines.oracle_eye.name',
    descriptionKey: 'doctrines.oracle_eye.description',
    flavorTextKey: 'doctrines.oracle_eye.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.MIND,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.THRESHOLD_MODIFIER,
        target: DoctrineTarget.SELF,
        value: -1 // Magic attack threshold reduced
      }
    ]
  },
  blink: {
    id: 'blink',
    nameKey: 'doctrines.blink.name',
    descriptionKey: 'doctrines.blink.description',
    flavorTextKey: 'doctrines.blink.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.AIR,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    // Teleports caster 4 tiles — approximated as NEGATE_HITS 99 (avoid all damage)
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 99 // Avoid all damage this turn (teleport approximation)
      }
    ]
  },
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
    effects: [
      {
        type: DoctrineEffectType.HEAL,
        target: DoctrineTarget.SELF,
        value: 0 // Removes negative status effects
      }
    ]
  },
  fractal_invocation: {
    id: 'fractal_invocation',
    nameKey: 'doctrines.fractal_invocation.name',
    descriptionKey: 'doctrines.fractal_invocation.description',
    flavorTextKey: 'doctrines.fractal_invocation.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.LIGHT,
    tier: 2,
    manaCost: 5,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 50 // Negate 50% of incoming hits (rounded up)
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD - TIER 2 - VOID
  // ═══════════════════════════════════════
  silence_vortex: {
    id: 'silence_vortex',
    nameKey: 'doctrines.silence_vortex.name',
    descriptionKey: 'doctrines.silence_vortex.description',
    flavorTextKey: 'doctrines.silence_vortex.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.MIND,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 3,
    effects: [
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.STUNNED,
        duration: 1
      }
    ]
  },
  transfusion: {
    id: 'transfusion',
    nameKey: 'doctrines.transfusion.name',
    descriptionKey: 'doctrines.transfusion.description',
    flavorTextKey: 'doctrines.transfusion.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.DARKNESS,
    tier: 2,
    manaCost: 5,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.HEAL,
        target: DoctrineTarget.SELF,
        value: 6 // Sacrifice 2 health to restore 6 mana
      }
    ]
  },
  fireball: {
    id: 'fireball',
    nameKey: 'doctrines.fireball.name',
    descriptionKey: 'doctrines.fireball.description',
    flavorTextKey: 'doctrines.fireball.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.FIRE,
    tier: 2,
    manaCost: 5,
    isUltimate: false,
    aoePattern: AoEPatternType.DIAMOND,
    castRange: 3,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 3 // Roll 3 dice against all enemies in area (2x2)
      },
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ALL_ENEMIES,
        statusEffect: StatusEffect.BURNING,
        duration: 1
      }
    ]
  },
  fragility_curse: {
    id: 'fragility_curse',
    nameKey: 'doctrines.fragility_curse.name',
    descriptionKey: 'doctrines.fragility_curse.description',
    flavorTextKey: 'doctrines.fragility_curse.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.AIR,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 4,
    // Ranged attack: +3 power dice at range 4
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 3 // +3 power dice ranged attack
      }
    ]
  },

  // ═══════════════════════════════════════
  // HERALD - TIER 3 - FORM
  // ═══════════════════════════════════════
  judgment_aurora: {
    id: 'judgment_aurora',
    nameKey: 'doctrines.judgment_aurora.name',
    descriptionKey: 'doctrines.judgment_aurora.description',
    flavorTextKey: 'doctrines.judgment_aurora.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.LIGHT,
    tier: 3,
    manaCost: 9,
    isUltimate: true,
    // Ultimate: requires sacrifice (1 Wound) to activate
    effects: [
      {
        type: DoctrineEffectType.GUARANTEED_CRITICAL,
        target: DoctrineTarget.SELF,
        value: 1 // All successes are criticals
      }
    ]
  },
  temporal_prison: {
    id: 'temporal_prison',
    nameKey: 'doctrines.temporal_prison.name',
    descriptionKey: 'doctrines.temporal_prison.description',
    flavorTextKey: 'doctrines.temporal_prison.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.WATER,
    tier: 3,
    manaCost: 9,
    isUltimate: true,
    aoePattern: AoEPatternType.DIAMOND,
    castRange: 4,
    // Ultimate: 5 dice area 3x3 + stun
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 5 // Roll 5 dice against all enemies in area (3x3)
      },
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ALL_ENEMIES,
        statusEffect: StatusEffect.STUNNED,
        duration: 1
      }
    ]
  },
  blinding_faith: {
    id: 'blinding_faith',
    nameKey: 'doctrines.blinding_faith.name',
    descriptionKey: 'doctrines.blinding_faith.description',
    flavorTextKey: 'doctrines.blinding_faith.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.FORM,
    attribute: DoctrineAttributeType.LIGHTNING,
    tier: 3,
    manaCost: 6,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 4,
    // Single target: +7 power + IMMOBILIZED 2t
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 7 // +7 power dice single target
      },
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.IMMOBILIZED,
        duration: 2
      }
    ]
  },
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
    aoePattern: AoEPatternType.SINGLE,
    castRange: 4,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 4, // Fixed buff: +2 dice per enemy tier (Tier 1=+2, Tier 2=+4, Tier 3=+6). Default +4.
        scalesWithEnemyTier: true // Backend uses enemy tier to calculate: tier * 2
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
    // Ultimate: requires sacrifice (1 Wound) to activate
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 10,
        sixesGenerateExtraHits: 1 // Each 6 rolled generates 1 extra hit
      }
    ]
  },
  black_hole: {
    id: 'black_hole',
    nameKey: 'doctrines.black_hole.name',
    descriptionKey: 'doctrines.black_hole.description',
    flavorTextKey: 'doctrines.black_hole.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.DARKNESS,
    tier: 3,
    manaCost: 10,
    isUltimate: true,
    aoePattern: AoEPatternType.CIRCLE_2,
    castRange: 4,
    // Ultimate: requires sacrifice (1 Wound) to activate
    effects: [
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ALL_ENEMIES,
        statusEffect: StatusEffect.STUNNED,
        duration: 1
      },
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ALL_ENEMIES,
        value: 2
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
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 0, // No hit negation, but triggers thorns
        duration: 2,
        thornsDamage: 2 // Custom field: deal 2 damage to attackers when hit
      }
    ]
  },
  disintegration_ray: {
    id: 'disintegration_ray',
    nameKey: 'doctrines.disintegration_ray.name',
    descriptionKey: 'doctrines.disintegration_ray.description',
    flavorTextKey: 'doctrines.disintegration_ray.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.VOID,
    attribute: DoctrineAttributeType.DARKNESS,
    tier: 3,
    manaCost: 8,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 5,
    // Destroy non-boss target — approximated as massive direct damage
    effects: [
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ENEMY,
        value: 99 // Instant destroy non-boss target
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
