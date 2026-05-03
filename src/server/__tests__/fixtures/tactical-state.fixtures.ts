import {
  TACTICAL_STATE_VERSION,
  TerrainType,
  type GridPosition,
  type TacticalStateData,
  type TacticalUnitState,
  type TileState
} from '@shared/types/tactical-combat.types'

export function createTestGrid(width: number = 8, height: number = 7, overrides?: Partial<TileState>): TileState[][] {
  const tiles: TileState[][] = []
  for (let y = 0; y < height; y++) {
    const row: TileState[] = []
    for (let x = 0; x < width; x++) {
      row.push({
        position: { x, y },
        terrain: TerrainType.GRASS,
        occupantId: null,
        isWalkable: true,
        ...overrides
      })
    }
    tiles.push(row)
  }
  return tiles
}

export function createTestUnit(overrides: Partial<TacticalUnitState> & { id: string }): TacticalUnitState {
  return {
    name: overrides.id,
    position: { x: 0, y: 0 },
    hasMoved: false,
    hasActed: false,
    currentHealth: 10,
    maxHealth: 10,
    ...overrides
  }
}

export function createTestTacticalState(overrides?: Partial<TacticalStateData>): TacticalStateData {
  const gridWidth = overrides?.gridWidth ?? 8
  const gridHeight = overrides?.gridHeight ?? 7
  const tiles = overrides?.tiles ?? createTestGrid(gridWidth, gridHeight)

  const units = overrides?.units ?? [
    createTestUnit({ id: 'player-1', position: { x: 1, y: 3 } }),
    createTestUnit({ id: 'enemy-1', position: { x: 6, y: 3 } })
  ]

  // Place units on the grid
  for (const unit of units) {
    if (unit.position) {
      const { x, y } = unit.position
      if (tiles[y]?.[x]) {
        tiles[y][x].occupantId = unit.id
      }
    }
  }

  return {
    stateVersion: TACTICAL_STATE_VERSION,
    mapTemplateId: 'test-map',
    gridWidth,
    gridHeight,
    tiles,
    units,
    turnOrder: units.map((u) => u.id),
    currentTurnIndex: 0,
    turnNumber: 1,
    ...overrides,
    // Ensure tiles and units are always the resolved values
    ...(overrides?.tiles ? {} : { tiles }),
    ...(overrides?.units ? {} : { units })
  }
}

/**
 * Place a wall (unwalkable obstacle) at the given position.
 */
export function placeWall(tiles: TileState[][], pos: GridPosition): void {
  if (tiles[pos.y]?.[pos.x]) {
    tiles[pos.y][pos.x].terrain = TerrainType.OBSTACLE
    tiles[pos.y][pos.x].isWalkable = false
  }
}
