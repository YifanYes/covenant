export interface MissionPhase {
  enemies: string[]
  description: string
}

export interface MissionReward {
  gold?: number
  items?: string[]
}

export interface MissionTemplate {
  id: string
  name: string
  description: string
  narrative: string
  requiredTier: number
  phases: MissionPhase[]
  scaling: string
  rewards: MissionReward
}

export const TIER_PROGRESSION: Record<number, number> = {
  1: 2, // 2 missions to reach Tier 2
  2: 3, // 3 missions to reach Tier 3
  3: 3, // 3 missions to reach Tier 4
  4: 4, // 4 missions to reach Tier 5
  5: 4, // 4 missions to reach Tier 6
  6: 5, // 5 missions to reach Tier 7
  7: 5, // 5 missions to reach Tier 8
  8: 5, // 5 missions to reach Tier 9
  9: 5 // 5 missions to reach Tier 10
}

export const MISSIONS: Record<string, MissionTemplate> = {
  // Tier 1
  asalto_frontera: {
    id: 'asalto_frontera',
    name: 'missions.asalto_frontera.name',
    description: 'missions.asalto_frontera.description',
    narrative: 'missions.asalto_frontera.narrative',
    requiredTier: 1,
    phases: [
      { enemies: ['skeleton', 'skeleton'], description: 'missions.asalto_frontera.phase1' },
      { enemies: ['bandit_chief', 'skeleton', 'skeleton'], description: 'missions.asalto_frontera.phase2' }
    ],
    scaling: '+1 enemy per extra player',
    rewards: { gold: 50 }
  },
  ruta_suministros: {
    id: 'ruta_suministros',
    name: 'missions.ruta_suministros.name',
    description: 'missions.ruta_suministros.description',
    narrative: 'missions.ruta_suministros.narrative',
    requiredTier: 1,
    phases: [{ enemies: ['heretic_templar', 'heretic_templar'], description: 'missions.ruta_suministros.phase1' }],
    scaling: '+2 HP per extra player',
    rewards: { gold: 50 }
  },
  limpieza_ruinas: {
    id: 'limpieza_ruinas',
    name: 'missions.limpieza_ruinas.name',
    description: 'missions.limpieza_ruinas.description',
    narrative: 'missions.limpieza_ruinas.narrative',
    requiredTier: 1,
    phases: [
      { enemies: ['ghost', 'ghost'], description: 'missions.limpieza_ruinas.phase1' },
      { enemies: ['skeleton_warrior_elite'], description: 'missions.limpieza_ruinas.phase2' }
    ],
    scaling: '+1 Ghost per player, Guardian +2 HP per extra player',
    rewards: { gold: 50 }
  },

  // Tier 2
  profundidades_catedral: {
    id: 'profundidades_catedral',
    name: 'missions.profundidades_catedral.name',
    description: 'missions.profundidades_catedral.description',
    narrative: 'missions.profundidades_catedral.narrative',
    requiredTier: 2,
    phases: [
      {
        enemies: ['heretic_cultist', 'heretic_cultist', 'heretic_cultist'],
        description: 'missions.profundidades_catedral.phase1'
      },
      { enemies: ['heretic_templar', 'heretic_templar'], description: 'missions.profundidades_catedral.phase2' }
    ],
    scaling: '+1 Cultist per player, Phase 2 +1 Templar per 2 players',
    rewards: { gold: 100 }
  },
  caza_luna: {
    id: 'caza_luna',
    name: 'missions.caza_luna.name',
    description: 'missions.caza_luna.description',
    narrative: 'missions.caza_luna.narrative',
    requiredTier: 2,
    phases: [
      { enemies: ['young_werewolf', 'young_werewolf'], description: 'missions.caza_luna.phase1' },
      { enemies: ['alpha_werewolf', 'young_werewolf', 'young_werewolf'], description: 'missions.caza_luna.phase2' }
    ],
    scaling: '+1 Young Wolf per player, Alpha +1 attack die with 3+ players',
    rewards: { gold: 100 }
  },
  puente_suspiros: {
    id: 'puente_suspiros',
    name: 'missions.puente_suspiros.name',
    description: 'missions.puente_suspiros.description',
    narrative: 'missions.puente_suspiros.narrative',
    requiredTier: 2,
    phases: [
      {
        enemies: ['elite_bandit', 'elite_bandit', 'elite_bandit', 'elite_bandit'],
        description: 'missions.puente_suspiros.phase1'
      },
      { enemies: ['tank_heretic_templar'], description: 'missions.puente_suspiros.phase2' }
    ],
    scaling: '+2 minor enemies per player',
    rewards: { gold: 100 }
  },

  // Tier 3
  sabotaje_naval: {
    id: 'sabotaje_naval',
    name: 'missions.sabotaje_naval.name',
    description: 'missions.sabotaje_naval.description',
    narrative: 'missions.sabotaje_naval.narrative',
    requiredTier: 3,
    phases: [
      {
        enemies: ['heretic_templar', 'heretic_templar', 'heretic_templar', 'heretic_templar'],
        description: 'missions.sabotaje_naval.phase1'
      },
      { enemies: ['vampire_chief'], description: 'missions.sabotaje_naval.phase2' }
    ],
    scaling: '+1 enemy per player',
    rewards: { gold: 200 }
  },
  mansion_sangrienta: {
    id: 'mansion_sangrienta',
    name: 'missions.mansion_sangrienta.name',
    description: 'missions.mansion_sangrienta.description',
    narrative: 'missions.mansion_sangrienta.narrative',
    requiredTier: 3,
    phases: [
      {
        enemies: ['minor_vampire', 'minor_vampire', 'minor_vampire', 'minor_vampire', 'minor_vampire'],
        description: 'missions.mansion_sangrienta.phase1'
      },
      { enemies: ['herald_vampire'], description: 'missions.mansion_sangrienta.phase2' }
    ],
    scaling: '+1 enemy per player in phase 1, Boss +1 attack die per 2 players',
    rewards: { gold: 200 }
  },
  ecos_abismo: {
    id: 'ecos_abismo',
    name: 'missions.ecos_abismo.name',
    description: 'missions.ecos_abismo.description',
    narrative: 'missions.ecos_abismo.narrative',
    requiredTier: 3,
    phases: [
      {
        enemies: [
          'minor_demon',
          'minor_demon',
          'minor_demon',
          'minor_demon',
          'minor_demon',
          'minor_demon',
          'minor_demon',
          'minor_demon',
          'minor_demon',
          'minor_demon'
        ],
        description: 'missions.ecos_abismo.phase1'
      },
      { enemies: ['minor_nephilim'], description: 'missions.ecos_abismo.phase2' }
    ],
    scaling: '+2 demons per wave per player',
    rewards: { gold: 200 }
  }
}

export const getMissionsByTier = (tier: number): MissionTemplate[] => {
  return Object.values(MISSIONS).filter((m) => m.requiredTier <= tier)
}

export const getMission = (missionName: string): MissionTemplate | undefined => {
  return MISSIONS[missionName]
}
