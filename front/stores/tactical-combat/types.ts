import type {
  GridPosition,
  TacticalUnit,
  TileState,
  HighlightedTile,
  TacticalPhase,
  TacticalAction
} from '@shared/types/tactical-combat.types'

// Next enemy data returned from server when enemy is defeated
export interface NextEnemyData {
  id: string
  templateId: string
  name: string
  currentHealth: number
  maxHealth: number
}

// Attack animation data
export interface AttackAnimationData {
  attackerId: string
  targetId: string
  damageDealt: number
  targetKilled: boolean
  damageToAttacker: number
  attackerKilled: boolean
  nextEnemy?: NextEnemyData
  goldReward?: number
}

// Pending enemy attack data (for after movement animation)
export interface PendingEnemyAttack {
  attackerId: string
  targetId: string
  damageDealt: number
  targetKilled: boolean
}

// Pending status effect damage (for turn start DoT effects)
export interface PendingStatusEffectDamage {
  unitId: string
  damage: number
  killed: boolean
}

// Doctrine animation data
export interface DoctrineAnimationData {
  casterId: string
  doctrineId: string
  targetPosition: GridPosition
  affectedTiles: GridPosition[]
  affectedUnitIds: string[]
  effects: {
    unitId: string
    damageDealt?: number
    healthRestored?: number
    statusApplied?: string
    killed?: boolean
  }[]
}

// Grid slice state
export interface GridSliceState {
  gridWidth: number
  gridHeight: number
  tiles: TileState[][]
  playerUnits: TacticalUnit[]
  enemyUnits: TacticalUnit[]
}

// Turn slice state
export interface TurnSliceState {
  turnQueue: TacticalUnit[]
  currentTurnIndex: number
  activeUnitId: string | null
  turnNumber: number
}

// UI slice state
export interface UISliceState {
  hoveredTile: GridPosition | null
  selectedTile: GridPosition | null
  highlightedTiles: HighlightedTile[]
  isInitialized: boolean
  isSceneReady: boolean
}

// Action slice state
export interface ActionSliceState {
  pendingAction: TacticalAction | null
  phase: TacticalPhase
}

// Animation slice state
export interface AnimationSliceState {
  animatingUnitId: string | null
  animationPath: GridPosition[] | null
  isAttackAnimating: boolean
  attackAnimationData: AttackAnimationData | null
  pendingEnemyAttack: PendingEnemyAttack | null
  pendingStatusEffectDamage: PendingStatusEffectDamage | null
}

// Doctrine slice state
export interface DoctrineSliceState {
  selectedDoctrineId: string | null
  doctrineAnimationData: DoctrineAnimationData | null
  isDoctrineAnimating: boolean
}

// Combined store state
export interface TacticalCombatStoreState extends
  GridSliceState,
  TurnSliceState,
  UISliceState,
  ActionSliceState,
  AnimationSliceState,
  DoctrineSliceState {
  participationId: string | null
}
