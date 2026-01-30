import { DoctrineEffectType, DoctrineTarget, StatusEffect, type DoctrineDefinition } from '../types/doctrine.types'
import { CharacterClassName, MagicNature } from './classes'
import { AoEPatternType } from './aoe-patterns'

export const MAX_EQUIPPED_DOCTRINES = 2

export const DOCTRINES: Record<string, DoctrineDefinition> = {
  // TEMPLAR - TIER 1 - ORDER
  truth_blade: {
    id: 'truth_blade',
    nameKey: 'doctrines.truth_blade.name',
    descriptionKey: 'doctrines.truth_blade.description',
    flavorTextKey: 'doctrines.truth_blade.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.ORDER,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 1 // +1 power dice to next attack
      }
    ]
  },
  miraculous_protection: {
    id: 'miraculous_protection',
    nameKey: 'doctrines.miraculous_protection.name',
    descriptionKey: 'doctrines.miraculous_protection.description',
    flavorTextKey: 'doctrines.miraculous_protection.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.ORDER,
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
    magicNature: MagicNature.ORDER,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.ENEMY,
        value: -1, // Enemy -1 defense die
        duration: 1
      }
    ]
  },
  challenge: {
    id: 'challenge',
    nameKey: 'doctrines.challenge.name',
    descriptionKey: 'doctrines.challenge.description',
    flavorTextKey: 'doctrines.challenge.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.ORDER,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.ENEMY,
        value: -2, // Enemy -2 attack if targeting others
        duration: 1
      }
    ]
  },

  // TEMPLAR - TIER 1 - CHAOS
  igneous_cut: {
    id: 'igneous_cut',
    nameKey: 'doctrines.igneous_cut.name',
    descriptionKey: 'doctrines.igneous_cut.description',
    flavorTextKey: 'doctrines.igneous_cut.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.CHAOS,
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
        duration: 2
      }
    ]
  },
  reckless_strike: {
    id: 'reckless_strike',
    nameKey: 'doctrines.reckless_strike.name',
    descriptionKey: 'doctrines.reckless_strike.description',
    flavorTextKey: 'doctrines.reckless_strike.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.CHAOS,
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
  bite: {
    id: 'bite',
    nameKey: 'doctrines.bite.name',
    descriptionKey: 'doctrines.bite.description',
    flavorTextKey: 'doctrines.bite.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.CHAOS,
    tier: 1,
    manaCost: 2,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 1,
    effects: [
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ENEMY,
        value: 1 // +1 guaranteed hit
      }
    ]
  },
  shoulder_charge: {
    id: 'shoulder_charge',
    nameKey: 'doctrines.shoulder_charge.name',
    descriptionKey: 'doctrines.shoulder_charge.description',
    flavorTextKey: 'doctrines.shoulder_charge.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.CHAOS,
    tier: 1,
    manaCost: 2,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 1
      },
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.STUNNED,
        duration: 1
      }
    ]
  },

  // TEMPLAR - TIER 2 - ORDER
  light_shield: {
    id: 'light_shield',
    nameKey: 'doctrines.light_shield.name',
    descriptionKey: 'doctrines.light_shield.description',
    flavorTextKey: 'doctrines.light_shield.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.ORDER,
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
    magicNature: MagicNature.ORDER,
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
    magicNature: MagicNature.ORDER,
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
  bulwark: {
    id: 'bulwark',
    nameKey: 'doctrines.bulwark.name',
    descriptionKey: 'doctrines.bulwark.description',
    flavorTextKey: 'doctrines.bulwark.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.ORDER,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 1, // +1 defense die
        duration: 1
      }
    ]
  },

  // TEMPLAR - TIER 2 - CHAOS
  precise_strike: {
    id: 'precise_strike',
    nameKey: 'doctrines.precise_strike.name',
    descriptionKey: 'doctrines.precise_strike.description',
    flavorTextKey: 'doctrines.precise_strike.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.CHAOS,
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
    magicNature: MagicNature.CHAOS,
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
    magicNature: MagicNature.CHAOS,
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
    magicNature: MagicNature.CHAOS,
    tier: 2,
    manaCost: 5,
    isUltimate: false,
    aoePattern: AoEPatternType.CROSS,
    castRange: 1,
    effects: [
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ALL_ENEMIES,
        value: 2 // Attack up to 2 enemies
      }
    ]
  },

  // TEMPLAR - TIER 3 - ORDER (ULTIMATES)
  iron_bastion: {
    id: 'iron_bastion',
    nameKey: 'doctrines.iron_bastion.name',
    descriptionKey: 'doctrines.iron_bastion.description',
    flavorTextKey: 'doctrines.iron_bastion.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.ORDER,
    tier: 3,
    manaCost: 6,
    isUltimate: true,
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
    magicNature: MagicNature.ORDER,
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
    magicNature: MagicNature.ORDER,
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
  glory_banner: {
    id: 'glory_banner',
    nameKey: 'doctrines.glory_banner.name',
    descriptionKey: 'doctrines.glory_banner.description',
    flavorTextKey: 'doctrines.glory_banner.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.ORDER,
    tier: 3,
    manaCost: 7,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 2, // +2 defense dice
        duration: 2
      }
    ]
  },

  // TEMPLAR - TIER 3 - CHAOS (ULTIMATES)
  disruption_storm: {
    id: 'disruption_storm',
    nameKey: 'doctrines.disruption_storm.name',
    descriptionKey: 'doctrines.disruption_storm.description',
    flavorTextKey: 'doctrines.disruption_storm.flavor',
    className: CharacterClassName.TEMPLAR,
    magicNature: MagicNature.CHAOS,
    tier: 3,
    manaCost: 6,
    isUltimate: true,
    aoePattern: AoEPatternType.CROSS,
    castRange: 2,
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
    magicNature: MagicNature.CHAOS,
    tier: 3,
    manaCost: 8,
    isUltimate: true,
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
    magicNature: MagicNature.CHAOS,
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
    magicNature: MagicNature.CHAOS,
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

  // HERALD - TIER 1 - ORDER
  ice_lance: {
    id: 'ice_lance',
    nameKey: 'doctrines.ice_lance.name',
    descriptionKey: 'doctrines.ice_lance.description',
    flavorTextKey: 'doctrines.ice_lance.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.ORDER,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
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
    magicNature: MagicNature.ORDER,
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
    magicNature: MagicNature.ORDER,
    tier: 1,
    manaCost: 2,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 99 // Negate next attack this turn
      }
    ]
  },
  unerring_dart: {
    id: 'unerring_dart',
    nameKey: 'doctrines.unerring_dart.name',
    descriptionKey: 'doctrines.unerring_dart.description',
    flavorTextKey: 'doctrines.unerring_dart.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.ORDER,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 4,
    effects: [
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ENEMY,
        value: 1 // 1 automatic damage ignoring defense
      }
    ]
  },

  // HERALD - TIER 1 - CHAOS
  combustion: {
    id: 'combustion',
    nameKey: 'doctrines.combustion.name',
    descriptionKey: 'doctrines.combustion.description',
    flavorTextKey: 'doctrines.combustion.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.CHAOS,
    tier: 1,
    manaCost: 4,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.BURNING,
        duration: 1
      }
    ]
  },
  plasma_missile: {
    id: 'plasma_missile',
    nameKey: 'doctrines.plasma_missile.name',
    descriptionKey: 'doctrines.plasma_missile.description',
    flavorTextKey: 'doctrines.plasma_missile.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.CHAOS,
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
    magicNature: MagicNature.CHAOS,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 2 // +2 power to next attack doctrine
      }
    ]
  },
  shadow_step: {
    id: 'shadow_step',
    nameKey: 'doctrines.shadow_step.name',
    descriptionKey: 'doctrines.shadow_step.description',
    flavorTextKey: 'doctrines.shadow_step.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.CHAOS,
    tier: 1,
    manaCost: 3,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.GUARANTEED_CRITICAL,
        target: DoctrineTarget.SELF,
        value: 1 // Next attack ignores defense
      }
    ]
  },

  // HERALD - TIER 2 - ORDER
  oracle_eye: {
    id: 'oracle_eye',
    nameKey: 'doctrines.oracle_eye.name',
    descriptionKey: 'doctrines.oracle_eye.description',
    flavorTextKey: 'doctrines.oracle_eye.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.ORDER,
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
    magicNature: MagicNature.ORDER,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.NEGATE_HITS,
        target: DoctrineTarget.SELF,
        value: 99 // Avoid all damage this turn
      }
    ]
  },
  nullify: {
    id: 'nullify',
    nameKey: 'doctrines.nullify.name',
    descriptionKey: 'doctrines.nullify.description',
    flavorTextKey: 'doctrines.nullify.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.ORDER,
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
    magicNature: MagicNature.ORDER,
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

  // HERALD - TIER 2 - CHAOS
  silence_vortex: {
    id: 'silence_vortex',
    nameKey: 'doctrines.silence_vortex.name',
    descriptionKey: 'doctrines.silence_vortex.description',
    flavorTextKey: 'doctrines.silence_vortex.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.CHAOS,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
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
    magicNature: MagicNature.CHAOS,
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
    magicNature: MagicNature.CHAOS,
    tier: 2,
    manaCost: 5,
    isUltimate: false,
    aoePattern: AoEPatternType.DIAMOND,
    castRange: 3,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 4 // Force 4 attack against all enemies
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
    magicNature: MagicNature.CHAOS,
    tier: 2,
    manaCost: 4,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.ENEMY,
        value: -2, // Enemy -2 defense dice
        duration: 2
      }
    ]
  },

  // HERALD - TIER 3 - ORDER (ULTIMATES)
  judgment_aurora: {
    id: 'judgment_aurora',
    nameKey: 'doctrines.judgment_aurora.name',
    descriptionKey: 'doctrines.judgment_aurora.description',
    flavorTextKey: 'doctrines.judgment_aurora.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.ORDER,
    tier: 3,
    manaCost: 9,
    isUltimate: true,
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
    magicNature: MagicNature.ORDER,
    tier: 3,
    manaCost: 9,
    isUltimate: true,
    effects: [
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
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
    magicNature: MagicNature.ORDER,
    tier: 3,
    manaCost: 6,
    isUltimate: false,
    aoePattern: AoEPatternType.DIAMOND,
    castRange: 3,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.ALL_ENEMIES,
        value: -2, // All enemies -2 attack power
        duration: 1
      }
    ]
  },
  inspiration: {
    id: 'inspiration',
    nameKey: 'doctrines.inspiration.name',
    descriptionKey: 'doctrines.inspiration.description',
    flavorTextKey: 'doctrines.inspiration.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.ORDER,
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

  // HERALD - TIER 3 - CHAOS (ULTIMATES)
  stellar_collapse: {
    id: 'stellar_collapse',
    nameKey: 'doctrines.stellar_collapse.name',
    descriptionKey: 'doctrines.stellar_collapse.description',
    flavorTextKey: 'doctrines.stellar_collapse.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.CHAOS,
    tier: 3,
    manaCost: 10,
    isUltimate: true,
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
    magicNature: MagicNature.CHAOS,
    tier: 3,
    manaCost: 10,
    isUltimate: true,
    aoePattern: AoEPatternType.CIRCLE_2,
    castRange: 4,
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
  flaming_apotheosis: {
    id: 'flaming_apotheosis',
    nameKey: 'doctrines.flaming_apotheosis.name',
    descriptionKey: 'doctrines.flaming_apotheosis.description',
    flavorTextKey: 'doctrines.flaming_apotheosis.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.CHAOS,
    tier: 3,
    manaCost: 7,
    isUltimate: false,
    effects: [
      {
        type: DoctrineEffectType.DIRECT_DAMAGE,
        target: DoctrineTarget.ENEMY,
        value: 2 // If attacker hits you, they take 2 damage
      },
      {
        type: DoctrineEffectType.APPLY_STATUS,
        target: DoctrineTarget.ENEMY,
        statusEffect: StatusEffect.BURNING,
        duration: 2
      }
    ]
  },
  disintegration_ray: {
    id: 'disintegration_ray',
    nameKey: 'doctrines.disintegration_ray.name',
    descriptionKey: 'doctrines.disintegration_ray.description',
    flavorTextKey: 'doctrines.disintegration_ray.flavor',
    className: CharacterClassName.HERALD,
    magicNature: MagicNature.CHAOS,
    tier: 3,
    manaCost: 8,
    isUltimate: false,
    aoePattern: AoEPatternType.SINGLE,
    castRange: 5,
    effects: [
      {
        type: DoctrineEffectType.POWER_MODIFIER,
        target: DoctrineTarget.SELF,
        value: 5 // +5 power, refund mana on kill
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
