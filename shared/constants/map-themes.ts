import type { TerrainType, TileState } from '@shared/types/tactical-combat.types'

interface MapTheme {
  primaryTerrain: TerrainType
  borderTerrain: TerrainType
  // Optional terrain features (cannot override border tiles)
  features?: {
    terrain: TerrainType
    positions: { x: number; y: number }[]
  }[]
}

// Map theme definitions
const MAP_THEMES = {
  northern_fortress: {
    primaryTerrain: 'STONE',
    borderTerrain: 'OBSTACLE',
    features: [
      // Inner grass courtyard
      {
        terrain: 'GRASS',
        positions: [
          { x: 2, y: 2 }, { x: 3, y: 2 }, { x: 4, y: 2 }, { x: 5, y: 2 },
          { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }
        ]
      }
    ]
  },
  coastal_harbor: {
    primaryTerrain: 'STONE',
    borderTerrain: 'WATER',
    features: [
      // Dock area (stone)
      {
        terrain: 'STONE',
        positions: [
          { x: 1, y: 1 }, { x: 2, y: 1 }, { x: 3, y: 1 },
          { x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 },
          { x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 },
          { x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }
        ]
      },
      // Ship deck area (grass as wood substitute)
      {
        terrain: 'GRASS',
        positions: [
          { x: 4, y: 2 }, { x: 5, y: 2 }, { x: 6, y: 2 },
          { x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 }
        ]
      }
    ]
  },
  southern_outpost: {
    primaryTerrain: 'GRASS',
    borderTerrain: 'LAVA',
    features: [
      // Stone fortifications in center
      {
        terrain: 'STONE',
        positions: [
          { x: 3, y: 2 }, { x: 4, y: 2 },
          { x: 3, y: 3 }, { x: 4, y: 3 }
        ]
      },
      // Additional lava pools
      {
        terrain: 'LAVA',
        positions: [
          { x: 2, y: 1 }, { x: 5, y: 4 }
        ]
      }
    ]
  },
  default: {
    primaryTerrain: 'GRASS',
    borderTerrain: 'STONE',
    features: []
  }
} as const satisfies Record<string, MapTheme>

// Derive MapThemeId from the object keys
export type MapThemeId = keyof typeof MAP_THEMES

/**
 * Generate tiles for a specific map theme
 */
export function generateMapTiles(
  mapId: string,
  gridWidth: number,
  gridHeight: number
): TileState[][] {
  const theme: MapTheme = MAP_THEMES[mapId as MapThemeId] ?? MAP_THEMES.default
  const tiles: TileState[][] = []

  for (let y = 0; y < gridHeight; y++) {
    tiles[y] = []
    for (let x = 0; x < gridWidth; x++) {
      // Check if this is a border tile
      const isBorder = x === 0 || x === gridWidth - 1 || y === 0 || y === gridHeight - 1
      let terrain: TerrainType = isBorder ? theme.borderTerrain : theme.primaryTerrain

      tiles[y][x] = {
        position: { x, y },
        terrain,
        occupantId: null,
        isWalkable: terrain !== 'WATER' && terrain !== 'LAVA' && terrain !== 'OBSTACLE'
      }
    }
  }

  // Apply terrain features (skip border tiles to preserve map boundaries)
  if (theme.features) {
    for (const feature of theme.features) {
      for (const pos of feature.positions) {
        const isBorder = pos.x === 0 || pos.x === gridWidth - 1 || pos.y === 0 || pos.y === gridHeight - 1
        if (!isBorder && tiles[pos.y]?.[pos.x]) {
          tiles[pos.y][pos.x].terrain = feature.terrain
          tiles[pos.y][pos.x].isWalkable =
            feature.terrain !== 'WATER' &&
            feature.terrain !== 'LAVA' &&
            feature.terrain !== 'OBSTACLE'
        }
      }
    }
  }

  return tiles
}

/**
 * Get available map theme IDs
 */
export function getMapThemeIds(): MapThemeId[] {
  return Object.keys(MAP_THEMES) as MapThemeId[]
}
