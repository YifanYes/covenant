import type { TerrainType } from '../types/tactical-combat.types'

// Terrain configuration
export interface TerrainConfig {
  movementCost: number
  isWalkable: boolean
  damagePerTurn: number
  statusEffect: string | null
}

export const TERRAIN_CONFIG: Record<TerrainType, TerrainConfig> = {
  GRASS: {
    movementCost: 1,
    isWalkable: true,
    damagePerTurn: 0,
    statusEffect: null
  },
  STONE: {
    movementCost: 1,
    isWalkable: true,
    damagePerTurn: 0,
    statusEffect: null
  },
  WATER: {
    movementCost: 2,
    isWalkable: true,
    damagePerTurn: 0,
    statusEffect: 'WET' // -1 movement next turn
  },
  LAVA: {
    movementCost: 2,
    isWalkable: true,
    damagePerTurn: 1,
    statusEffect: null
  },
  OBSTACLE: {
    movementCost: Infinity,
    isWalkable: false,
    damagePerTurn: 0,
    statusEffect: null
  }
}

// Visual colors for terrain (for Phaser rendering)
export const TERRAIN_COLORS: Record<TerrainType, number> = {
  GRASS: 0x4a7c59, // Forest green
  STONE: 0x708090, // Slate gray
  WATER: 0x4169e1, // Royal blue
  LAVA: 0xff4500, // Orange red
  OBSTACLE: 0x2f2f2f // Dark gray
}

// Tile highlight colors
export const HIGHLIGHT_COLORS = {
  MOVEMENT: 0x3b82f6, // Blue
  ATTACK: 0xef4444, // Red
  DOCTRINE: 0xa855f7, // Purple
  SELECTED: 0xfbbf24, // Yellow/amber
  HOVER: 0xffffff, // White
  PATH: 0x22c55e // Green
} as const
