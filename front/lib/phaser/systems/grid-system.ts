import Phaser from 'phaser'
import {
  TILE_WIDTH,
  TILE_HEIGHT,
  GRID_OFFSET_X,
  GRID_OFFSET_Y,
  DEPTH_LAYERS
} from '../config'
import type {
  GridPosition,
  TileState,
  TerrainType,
  TileHighlightType
} from '@shared/types/tactical-combat.types'

// Map terrain types to texture keys
const TERRAIN_TEXTURES: Record<TerrainType, string> = {
  GRASS: 'tile_grass',
  STONE: 'tile_stone',
  WATER: 'tile_water',
  LAVA: 'tile_lava',
  OBSTACLE: 'tile_obstacle'
}

// Map highlight types to texture keys
const HIGHLIGHT_TEXTURES: Record<TileHighlightType, string> = {
  MOVEMENT: 'highlight_movement',
  ATTACK: 'highlight_attack',
  DOCTRINE: 'highlight_doctrine',
  SELECTED: 'highlight_selected',
  HOVER: 'highlight_hover',
  PATH: 'highlight_path'
}

export class GridSystem {
  private scene: Phaser.Scene
  private width: number
  private height: number
  private tiles: Phaser.GameObjects.Image[][] = []
  private highlights: Map<string, Phaser.GameObjects.Image> = new Map()
  private hoverHighlight: Phaser.GameObjects.Image | null = null

  constructor(scene: Phaser.Scene, width: number, height: number) {
    this.scene = scene
    this.width = width
    this.height = height
  }

  // Convert grid coordinates to screen (isometric) coordinates
  gridToScreen(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: (gridX - gridY) * (TILE_WIDTH / 2) + GRID_OFFSET_X,
      y: (gridX + gridY) * (TILE_HEIGHT / 2) + GRID_OFFSET_Y
    }
  }

  // Convert screen coordinates to grid coordinates
  screenToGrid(screenX: number, screenY: number): GridPosition | null {
    // Adjust for offset
    const adjustedX = screenX - GRID_OFFSET_X
    const adjustedY = screenY - GRID_OFFSET_Y

    // Inverse isometric transformation
    const gridX = Math.floor(
      (adjustedX / (TILE_WIDTH / 2) + adjustedY / (TILE_HEIGHT / 2)) / 2
    )
    const gridY = Math.floor(
      (adjustedY / (TILE_HEIGHT / 2) - adjustedX / (TILE_WIDTH / 2)) / 2
    )

    // Check bounds
    if (gridX >= 0 && gridX < this.width && gridY >= 0 && gridY < this.height) {
      return { x: gridX, y: gridY }
    }

    return null
  }

  // Render the grid with given tile states
  render(tileStates?: TileState[][]): void {
    // Clear existing tiles
    this.clearGrid()

    for (let y = 0; y < this.height; y++) {
      this.tiles[y] = []
      for (let x = 0; x < this.width; x++) {
        const screenPos = this.gridToScreen(x, y)

        // Determine terrain type
        let terrain: TerrainType = 'GRASS'
        if (tileStates && tileStates[y] && tileStates[y][x]) {
          terrain = tileStates[y][x].terrain
        }

        const texture = TERRAIN_TEXTURES[terrain]
        const tile = this.scene.add.image(screenPos.x, screenPos.y, texture)

        // Set depth based on position for proper isometric sorting
        tile.setDepth(DEPTH_LAYERS.GRID + (x + y) * 0.01)

        // Make tile interactive
        tile.setInteractive()

        // Store grid position in tile data
        tile.setData('gridX', x)
        tile.setData('gridY', y)

        this.tiles[y][x] = tile
      }
    }
  }

  // Clear all grid tiles
  clearGrid(): void {
    for (const row of this.tiles) {
      for (const tile of row) {
        tile.destroy()
      }
    }
    this.tiles = []
  }

  // Set highlight on a specific tile
  setTileHighlight(position: GridPosition, type: TileHighlightType): void {
    const key = `${position.x},${position.y}`

    // Remove existing highlight at this position
    this.removeTileHighlight(position)

    const screenPos = this.gridToScreen(position.x, position.y)
    const texture = HIGHLIGHT_TEXTURES[type]
    const highlight = this.scene.add.image(screenPos.x, screenPos.y, texture)

    // Set depth above terrain
    highlight.setDepth(
      DEPTH_LAYERS.TILE_HIGHLIGHT + (position.x + position.y) * 0.01
    )

    this.highlights.set(key, highlight)
  }

  // Remove highlight from a specific tile
  removeTileHighlight(position: GridPosition): void {
    const key = `${position.x},${position.y}`
    const highlight = this.highlights.get(key)
    if (highlight) {
      highlight.destroy()
      this.highlights.delete(key)
    }
  }

  // Clear all highlights
  clearHighlights(): void {
    for (const highlight of this.highlights.values()) {
      highlight.destroy()
    }
    this.highlights.clear()
  }

  // Set hover highlight (only one at a time)
  setHoverHighlight(position: GridPosition): void {
    // Clear existing hover
    this.clearHoverHighlight()

    const screenPos = this.gridToScreen(position.x, position.y)
    this.hoverHighlight = this.scene.add.image(
      screenPos.x,
      screenPos.y,
      'highlight_hover'
    )
    this.hoverHighlight.setDepth(
      DEPTH_LAYERS.TILE_HIGHLIGHT + (position.x + position.y) * 0.01 + 0.001
    )
  }

  // Clear hover highlight
  clearHoverHighlight(): void {
    if (this.hoverHighlight) {
      this.hoverHighlight.destroy()
      this.hoverHighlight = null
    }
  }

  // Get tile at grid position
  getTileAt(position: GridPosition): Phaser.GameObjects.Image | null {
    if (
      position.y >= 0 &&
      position.y < this.tiles.length &&
      position.x >= 0 &&
      position.x < this.tiles[position.y].length
    ) {
      return this.tiles[position.y][position.x]
    }
    return null
  }

  // Check if position is within grid bounds
  isInBounds(position: GridPosition): boolean {
    return (
      position.x >= 0 &&
      position.x < this.width &&
      position.y >= 0 &&
      position.y < this.height
    )
  }

  // Get grid dimensions
  getDimensions(): { width: number; height: number } {
    return { width: this.width, height: this.height }
  }

  // Update grid size
  resize(width: number, height: number, tileStates?: TileState[][]): void {
    this.width = width
    this.height = height
    this.render(tileStates)
  }

  // Destroy the grid system
  destroy(): void {
    this.clearGrid()
    this.clearHighlights()
    this.clearHoverHighlight()
  }
}
