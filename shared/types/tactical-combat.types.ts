import type { ActiveStatusEffect } from './doctrine.types'
import type { CombatLogEntry } from './gamification.types'

// Grid position
export interface GridPosition {
  x: number
  y: number
}

// Terrain types
export const TerrainType = {
  GRASS: 'GRASS',
  STONE: 'STONE',
  WATER: 'WATER',
  LAVA: 'LAVA',
  OBSTACLE: 'OBSTACLE'
} as const
export type TerrainType = (typeof TerrainType)[keyof typeof TerrainType]

// Tile highlight types for visual feedback
export const TileHighlightType = {
  MOVEMENT: 'MOVEMENT',
  ATTACK: 'ATTACK',
  DOCTRINE: 'DOCTRINE',
  SELECTED: 'SELECTED',
  HOVER: 'HOVER',
  PATH: 'PATH'
} as const
export type TileHighlightType = (typeof TileHighlightType)[keyof typeof TileHighlightType]

// Highlighted tile with position and type
export interface HighlightedTile {
  position: GridPosition
  type: TileHighlightType
}

// Tactical unit representing player or enemy on the grid
export interface TacticalUnit {
  id: string
  templateId: string // Enemy template ID or 'player'
  name: string
  position: GridPosition
  isPlayer: boolean
  spriteUrl?: string // URL to the sprite image for Phaser rendering

  // Stats (from character/enemy)
  currentHealth: number
  maxHealth: number
  currentMana: number
  maxMana: number

  // Tactical stats
  movementRange: number // Tiles can move
  attackRange: number // From weapon
  speed: number // For turn order (higher = earlier)

  // Turn state
  hasMoved: boolean
  hasActed: boolean

  // Status
  activeEffects: ActiveStatusEffect[]
}

// Tile state for the grid
export interface TileState {
  position: GridPosition
  terrain: TerrainType
  occupantId: string | null
  isWalkable: boolean
}

// Combat phases
export const TacticalPhase = {
  SELECT_ACTION: 'select_action',
  SELECT_MOVE: 'select_move',
  SELECT_TARGET: 'select_target',
  ANIMATING: 'animating',
  ENEMY_TURN: 'enemy_turn'
} as const
export type TacticalPhase = (typeof TacticalPhase)[keyof typeof TacticalPhase]

// Action types
export const TacticalActionType = {
  MOVE: 'move',
  ATTACK: 'attack',
  DOCTRINE: 'doctrine',
  ITEM: 'item',
  WAIT: 'wait'
} as const
export type TacticalActionType = (typeof TacticalActionType)[keyof typeof TacticalActionType]

// Tactical action
export interface TacticalAction {
  type: TacticalActionType
  path?: GridPosition[] // For movement
  targetPosition?: GridPosition // For attacks/doctrines
  targetUnitIds?: string[] // Affected units
  doctrineId?: string
  itemId?: string
}

// Full tactical combat state
export interface TacticalCombatState {
  // Grid
  gridWidth: number
  gridHeight: number
  tiles: TileState[][]

  // Units
  playerUnits: TacticalUnit[]
  enemyUnits: TacticalUnit[]

  // Turn management
  turnQueue: TacticalUnit[]
  currentTurnIndex: number
  activeUnitId: string | null
  turnNumber: number

  // UI state
  phase: TacticalPhase
  selectedTile: GridPosition | null
  highlightedTiles: HighlightedTile[]
  pendingAction: TacticalAction | null
}

// Map template for predefined combat arenas
export interface MapTemplate {
  id: string
  name: string
  width: number
  height: number
  tiles: TerrainType[][]
  playerSpawn: GridPosition
  enemySpawns: GridPosition[]
}

// Initialization data for tactical combat
export interface TacticalInitData {
  mapTemplateId: string
  gridWidth: number
  gridHeight: number
  tiles: TileState[][]
  playerUnits: TacticalUnit[]
  enemyUnits: TacticalUnit[]
  turnQueue: TacticalUnit[]
}

// Unit state stored in tactical state (database JSON)
export interface TacticalUnitState {
  id: string
  name: string
  position: GridPosition
  hasMoved: boolean
  hasActed: boolean
  currentHealth: number
  maxHealth: number
}

// Tactical state stored in database (JSON field)
export interface TacticalStateData {
  mapTemplateId: string
  gridWidth: number
  gridHeight: number
  tiles: TileState[][]
  units: TacticalUnitState[]
  turnOrder: string[] // Unit IDs in turn order
  currentTurnIndex: number
  turnNumber: number
}

// Movement validation result
export interface MovementValidationResult {
  valid: boolean
  reason?: string
  pathCost?: number
}

// Movement execution result
export interface MovementExecutionResult {
  success: boolean
  newPosition: GridPosition
  updatedState: TacticalStateData
}

// Attack validation result
export interface AttackValidationResult {
  valid: boolean
  reason?: string
  distance?: number
}

// Tactical attack result (extends base combat result)
export interface TacticalAttackResult {
  success: boolean
  attackerId: string
  targetId: string
  damageDealt: number
  targetKilled: boolean
  damageToAttacker: number
  attackerKilled: boolean
  updatedState: TacticalStateData
  // Dice roll results for UI display
  attackerRolls: { value: number; isSuccess: boolean; isCritical: boolean }[]
  defenderRolls: { value: number; isSuccess: boolean; isCritical: boolean }[]
  counterAttackRolls?: { value: number; isSuccess: boolean; isCritical: boolean }[]
  counterDefenseRolls?: { value: number; isSuccess: boolean; isCritical: boolean }[]
  // Combat log entries generated from this attack
  logEntries: CombatLogEntry[]
  // Gold reward if enemy was defeated
  goldReward?: number
  // Next enemy data if a new enemy was spawned
  nextEnemy?: {
    id: string
    templateId: string
    name: string
    currentHealth: number
    maxHealth: number
  }
}

// Enemy AI turn result
export interface EnemyTurnResult {
  success: boolean
  enemyId: string
  action: 'move' | 'attack' | 'move_and_attack' | 'wait'

  // Movement data (if moved)
  moved: boolean
  path?: GridPosition[]
  newPosition?: GridPosition

  // Attack data (if attacked)
  attacked: boolean
  targetId?: string
  damageDealt?: number
  targetKilled?: boolean
  attackerRolls?: { value: number; isSuccess: boolean; isCritical: boolean }[]
  defenderRolls?: { value: number; isSuccess: boolean; isCritical: boolean }[]

  // Updated state
  updatedState: TacticalStateData

  // Combat log entries
  logEntries?: CombatLogEntry[]
}
