import { describe, expect, it } from 'vitest'
import { generateMapTiles, getMapThemeIds } from '@shared/constants/map-themes'

describe('generateMapTiles', () => {
  const gridWidth = 8
  const gridHeight = 6

  describe('default theme fallback', () => {
    it('should fall back to default theme for unknown mapId', () => {
      const tiles = generateMapTiles('unknown_map_id', gridWidth, gridHeight)

      expect(tiles).toHaveLength(gridHeight)
      expect(tiles[0]).toHaveLength(gridWidth)
      // Default theme has GRASS primary and STONE border
      expect(tiles[2][2].terrain).toBe('GRASS')
      expect(tiles[0][0].terrain).toBe('STONE')
    })

    it('should use default theme when mapId is "default"', () => {
      const tiles = generateMapTiles('default', gridWidth, gridHeight)

      // Interior should be GRASS
      expect(tiles[2][2].terrain).toBe('GRASS')
      expect(tiles[3][4].terrain).toBe('GRASS')
      // Borders should be STONE
      expect(tiles[0][4].terrain).toBe('STONE')
      expect(tiles[5][4].terrain).toBe('STONE')
    })
  })

  describe('border terrain application', () => {
    it('should apply border terrain to all edge tiles', () => {
      const tiles = generateMapTiles('default', gridWidth, gridHeight)

      // Top row (y=0)
      for (let x = 0; x < gridWidth; x++) {
        expect(tiles[0][x].terrain).toBe('STONE')
      }
      // Bottom row (y=gridHeight-1)
      for (let x = 0; x < gridWidth; x++) {
        expect(tiles[gridHeight - 1][x].terrain).toBe('STONE')
      }
      // Left column (x=0)
      for (let y = 0; y < gridHeight; y++) {
        expect(tiles[y][0].terrain).toBe('STONE')
      }
      // Right column (x=gridWidth-1)
      for (let y = 0; y < gridHeight; y++) {
        expect(tiles[y][gridWidth - 1].terrain).toBe('STONE')
      }
    })

    it('should use theme-specific border terrain', () => {
      const coastalTiles = generateMapTiles('coastal_harbor', gridWidth, gridHeight)
      expect(coastalTiles[0][0].terrain).toBe('WATER')

      const southernTiles = generateMapTiles('southern_outpost', gridWidth, gridHeight)
      expect(southernTiles[0][0].terrain).toBe('LAVA')
    })
  })

  describe('feature overlay', () => {
    it('should apply features to interior tiles', () => {
      const tiles = generateMapTiles('northern_fortress', gridWidth, gridHeight)

      // northern_fortress has GRASS features at inner positions
      expect(tiles[2][2].terrain).toBe('GRASS')
      expect(tiles[3][3].terrain).toBe('GRASS')
    })

    it('should not allow features to override border tiles', () => {
      // Even if a theme tried to place a feature at a border position,
      // the border should remain intact
      const tiles = generateMapTiles('coastal_harbor', gridWidth, gridHeight)

      // All border positions should remain WATER (the border terrain)
      expect(tiles[0][0].terrain).toBe('WATER')
      expect(tiles[0][gridWidth - 1].terrain).toBe('WATER')
      expect(tiles[gridHeight - 1][0].terrain).toBe('WATER')
      expect(tiles[gridHeight - 1][gridWidth - 1].terrain).toBe('WATER')
    })
  })

  describe('walkability calculation', () => {
    it('should mark GRASS tiles as walkable', () => {
      const tiles = generateMapTiles('default', gridWidth, gridHeight)
      expect(tiles[2][2].isWalkable).toBe(true)
    })

    it('should mark STONE tiles as walkable', () => {
      const tiles = generateMapTiles('default', gridWidth, gridHeight)
      expect(tiles[0][0].isWalkable).toBe(true)
    })

    it('should mark WATER tiles as non-walkable', () => {
      const tiles = generateMapTiles('coastal_harbor', gridWidth, gridHeight)
      expect(tiles[0][0].isWalkable).toBe(false)
    })

    it('should mark LAVA tiles as non-walkable', () => {
      const tiles = generateMapTiles('southern_outpost', gridWidth, gridHeight)
      expect(tiles[0][0].isWalkable).toBe(false)
    })

    it('should mark OBSTACLE tiles as non-walkable', () => {
      const tiles = generateMapTiles('northern_fortress', gridWidth, gridHeight)
      // northern_fortress uses OBSTACLE for borders
      expect(tiles[0][0].isWalkable).toBe(false)
    })
  })

  describe('spawn position safety', () => {
    it('should have walkable tiles at player spawn position (1,3) for all themes', () => {
      const themeIds = getMapThemeIds()

      for (const themeId of themeIds) {
        const tiles = generateMapTiles(themeId, gridWidth, gridHeight)
        expect(tiles[3][1].isWalkable).toBe(true)
      }
    })

    it('should have walkable tiles at enemy spawn position (6,2) for all themes', () => {
      const themeIds = getMapThemeIds()

      for (const themeId of themeIds) {
        const tiles = generateMapTiles(themeId, gridWidth, gridHeight)
        expect(tiles[2][6].isWalkable).toBe(true)
      }
    })
  })

  describe('tile structure', () => {
    it('should create tiles with correct position coordinates', () => {
      const tiles = generateMapTiles('default', gridWidth, gridHeight)

      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          expect(tiles[y][x].position).toEqual({ x, y })
        }
      }
    })

    it('should initialize all tiles with null occupantId', () => {
      const tiles = generateMapTiles('default', gridWidth, gridHeight)

      for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
          expect(tiles[y][x].occupantId).toBeNull()
        }
      }
    })
  })
})

describe('getMapThemeIds', () => {
  it('should return all available theme IDs', () => {
    const themeIds = getMapThemeIds()

    expect(themeIds).toContain('default')
    expect(themeIds).toContain('northern_fortress')
    expect(themeIds).toContain('coastal_harbor')
    expect(themeIds).toContain('southern_outpost')
    expect(themeIds).toHaveLength(4)
  })
})
