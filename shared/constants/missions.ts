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
  successText: string
  failureText: string
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
    successText: 'missions.asalto_frontera.success',
    failureText: 'missions.asalto_frontera.failure',
    requiredTier: 1,
    phases: [
      {
        enemies: ['skeleton', 'skeleton', 'bandit_stalker'],
        description: 'missions.asalto_frontera.phase1'
      }
    ],
    scaling: '+1 enemy per extra player',
    rewards: { gold: 50 }
  },
  ruta_suministros: {
    id: 'ruta_suministros',
    name: 'missions.ruta_suministros.name',
    description: 'missions.ruta_suministros.description',
    successText: 'missions.ruta_suministros.success',
    failureText: 'missions.ruta_suministros.failure',
    requiredTier: 1,
    phases: [{ enemies: ['bandit_runic', 'bandit_runic'], description: 'missions.ruta_suministros.phase1' }],
    scaling: '+1 Bandit per extra player',
    rewards: { gold: 50 }
  },
  limpieza_ruinas: {
    id: 'limpieza_ruinas',
    name: 'missions.limpieza_ruinas.name',
    description: 'missions.limpieza_ruinas.description',
    successText: 'missions.limpieza_ruinas.success',
    failureText: 'missions.limpieza_ruinas.failure',
    requiredTier: 1,
    phases: [
      { enemies: ['giant_spider', 'giant_spider'], description: 'missions.limpieza_ruinas.phase1' },
      { enemies: ['ghost', 'ghost'], description: 'missions.limpieza_ruinas.phase2' }
    ],
    scaling: '+1 Ghost per player, Guardian +2 HP per extra player',
    rewards: { gold: 50 }
  },
  pozo_maldito: {
    id: 'pozo_maldito',
    name: 'missions.pozo_maldito.name',
    description: 'missions.pozo_maldito.description',
    successText: 'missions.pozo_maldito.success',
    failureText: 'missions.pozo_maldito.failure',
    requiredTier: 1,
    phases: [
      { enemies: ['giant_spider', 'giant_spider'], description: 'missions.pozo_maldito.phase1' },
      { enemies: ['skeleton', 'ghost', 'ghost'], description: 'missions.pozo_maldito.phase2' }
    ],
    scaling: '+1 Ghost per extra player',
    rewards: { gold: 50 }
  },

  // Tier 2
  profundidades_catedral: {
    id: 'profundidades_catedral',
    name: 'missions.profundidades_catedral.name',
    description: 'missions.profundidades_catedral.description',
    successText: 'missions.profundidades_catedral.success',
    failureText: 'missions.profundidades_catedral.failure',
    requiredTier: 2,
    phases: [
      {
        enemies: ['fallen_inquisitor', 'fallen_inquisitor', 'fallen_inquisitor'],
        description: 'missions.profundidades_catedral.phase1'
      },
      {
        enemies: ['fallen_inquisitor', 'fallen_inquisitor', 'shadow_demon'],
        description: 'missions.profundidades_catedral.phase2'
      }
    ],
    scaling: '+1 Inquisitor per player, Phase 2 altar gains +2 HP per 2 players',
    rewards: { gold: 100 }
  },
  caza_luna: {
    id: 'caza_luna',
    name: 'missions.caza_luna.name',
    description: 'missions.caza_luna.description',
    successText: 'missions.caza_luna.success',
    failureText: 'missions.caza_luna.failure',
    requiredTier: 2,
    phases: [
      { enemies: ['werewolf', 'werewolf'], description: 'missions.caza_luna.phase1' },
      { enemies: ['werewolf_alpha'], description: 'missions.caza_luna.phase2' }
    ],
    scaling: '+1 Werewolf per player, Alpha +1 attack die with 3+ players',
    rewards: { gold: 100 }
  },
  puente_suspiros: {
    id: 'puente_suspiros',
    name: 'missions.puente_suspiros.name',
    description: 'missions.puente_suspiros.description',
    successText: 'missions.puente_suspiros.success',
    failureText: 'missions.puente_suspiros.failure',
    requiredTier: 2,
    phases: [
      {
        enemies: ['armored_templar', 'armored_templar', 'fallen_inquisitor', 'fallen_inquisitor'],
        description: 'missions.puente_suspiros.phase1'
      }
    ],
    scaling: '+1 Templar per player',
    rewards: { gold: 100 }
  },
  informante: {
    id: 'informante',
    name: 'missions.informante.name',
    description: 'missions.informante.description',
    successText: 'missions.informante.success',
    failureText: 'missions.informante.failure',
    requiredTier: 2,
    phases: [
      {
        enemies: ['skeleton', 'skeleton', 'skeleton', 'fallen_templar', 'fallen_templar'],
        description: 'missions.informante.phase1'
      },
      { enemies: ['bandit_chief', 'skeleton', 'skeleton'], description: 'missions.informante.phase2' }
    ],
    scaling: '+1 Skeleton per floor per player, Informant gains +2 HP with 3+ players',
    rewards: { gold: 100 }
  },

  // Tier 3
  sabotaje_naval: {
    id: 'sabotaje_naval',
    name: 'missions.sabotaje_naval.name',
    description: 'missions.sabotaje_naval.description',
    successText: 'missions.sabotaje_naval.success',
    failureText: 'missions.sabotaje_naval.failure',
    requiredTier: 3,
    phases: [
      { enemies: ['armored_templar', 'armored_templar'], description: 'missions.sabotaje_naval.phase1' },
      { enemies: ['magma_demon', 'magma_demon'], description: 'missions.sabotaje_naval.phase2' },
      { enemies: ['elite_armored_templar'], description: 'missions.sabotaje_naval.phase3' }
    ],
    scaling: '+1 Templar per player, +1 escape turn with 4 players',
    rewards: { gold: 200 }
  },
  mansion_sangrienta: {
    id: 'mansion_sangrienta',
    name: 'missions.mansion_sangrienta.name',
    description: 'missions.mansion_sangrienta.description',
    successText: 'missions.mansion_sangrienta.success',
    failureText: 'missions.mansion_sangrienta.failure',
    requiredTier: 3,
    phases: [
      { enemies: ['vampire', 'vampire', 'vampire'], description: 'missions.mansion_sangrienta.phase1' },
      {
        enemies: ['vampire', 'vampire', 'vampire', 'vampire'],
        description: 'missions.mansion_sangrienta.phase2'
      },
      { enemies: ['vampire', 'ghost', 'ghost'], description: 'missions.mansion_sangrienta.phase3' }
    ],
    scaling: '+1 Vampire per player in phase 1, Boss +1 attack die per 2 players',
    rewards: { gold: 200 }
  },
  ecos_abismo: {
    id: 'ecos_abismo',
    name: 'missions.ecos_abismo.name',
    description: 'missions.ecos_abismo.description',
    successText: 'missions.ecos_abismo.success',
    failureText: 'missions.ecos_abismo.failure',
    requiredTier: 3,
    phases: [
      {
        enemies: ['shadow_demon', 'shadow_demon', 'shadow_demon'],
        description: 'missions.ecos_abismo.phase1'
      },
      {
        enemies: ['shadow_demon', 'shadow_demon', 'shadow_demon', 'shadow_demon'],
        description: 'missions.ecos_abismo.phase2'
      },
      { enemies: ['fallen_inquisitor_boss'], description: 'missions.ecos_abismo.phase3' }
    ],
    scaling: '+1 Demon per wave per player',
    rewards: { gold: 200 }
  },
  asedio_avanzadilla: {
    id: 'asedio_avanzadilla',
    name: 'missions.asedio_avanzadilla.name',
    description: 'missions.asedio_avanzadilla.description',
    successText: 'missions.asedio_avanzadilla.success',
    failureText: 'missions.asedio_avanzadilla.failure',
    requiredTier: 3,
    phases: [
      { enemies: ['minor_demon', 'minor_demon', 'minor_demon'], description: 'missions.asedio_avanzadilla.phase1' },
      {
        enemies: ['minor_demon', 'minor_demon', 'minor_demon', 'elite_demon', 'elite_demon'],
        description: 'missions.asedio_avanzadilla.phase2'
      },
      { enemies: ['demon_lord', 'elite_demon', 'elite_demon'], description: 'missions.asedio_avanzadilla.phase3' }
    ],
    scaling: '+1 Minor Demon per wave per extra player',
    rewards: { gold: 200 }
  },
  // Tier 4 (Boss Raids)
  asedio_final: {
    id: 'asedio_final',
    name: 'missions.asedio_final.name',
    description: 'missions.asedio_final.description',
    successText: 'missions.asedio_final.success',
    failureText: 'missions.asedio_final.failure',
    requiredTier: 4,
    phases: [{ enemies: ['belphegor_avatar'], description: 'missions.asedio_final.phase1' }],
    scaling: 'Boss has [Players x 3] actions per round',
    rewards: { gold: 400 }
  },
  bestia_despierta: {
    id: 'bestia_despierta',
    name: 'missions.bestia_despierta.name',
    description: 'missions.bestia_despierta.description',
    successText: 'missions.bestia_despierta.success',
    failureText: 'missions.bestia_despierta.failure',
    requiredTier: 4,
    phases: [
      { enemies: ['behemoth'], description: 'missions.bestia_despierta.phase1' },
      { enemies: ['behemoth'], description: 'missions.bestia_despierta.phase2' }
    ],
    scaling: 'Boss HP = 20 * Players',
    rewards: { gold: 400 }
  },
  juicio_celestial: {
    id: 'juicio_celestial',
    name: 'missions.juicio_celestial.name',
    description: 'missions.juicio_celestial.description',
    successText: 'missions.juicio_celestial.success',
    failureText: 'missions.juicio_celestial.failure',
    requiredTier: 4,
    phases: [
      { enemies: ['ghost', 'ghost', 'ghost'], description: 'missions.juicio_celestial.phase1' },
      { enemies: ['nephilim'], description: 'missions.juicio_celestial.phase2' }
    ],
    scaling: 'Angel summons [Players - 1] Reflections (1 HP) each turn',
    rewards: { gold: 400 }
  }
}

export const getMissionsByTier = (tier: number): MissionTemplate[] => {
  return Object.values(MISSIONS).filter((m) => m.requiredTier <= tier)
}

export const getMission = (missionName: string): MissionTemplate | undefined => {
  return MISSIONS[missionName]
}
