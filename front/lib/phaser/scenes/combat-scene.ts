import Phaser from 'phaser'
import { GridSystem } from '../systems/grid-system'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_MAX,
  DEPTH_LAYERS
} from '../config'
import { useTacticalCombatStore } from '@/stores/tactical-combat.store'
import type {
  GridPosition,
  TacticalUnit,
  TileHighlightType
} from '@shared/types/tactical-combat.types'

export class CombatScene extends Phaser.Scene {
  private gridSystem!: GridSystem
  private units: Map<string, Phaser.GameObjects.Image> = new Map()
  private unsubscribe?: () => void

  // Camera drag state
  private isDragging = false
  private dragStartX = 0
  private dragStartY = 0
  private cameraStartX = 0
  private cameraStartY = 0

  constructor() {
    super({ key: 'CombatScene' })
  }

  create(): void {
    // Get initial state from store
    const state = useTacticalCombatStore.getState()

    // Initialize grid
    this.gridSystem = new GridSystem(this, state.gridWidth, state.gridHeight)
    this.gridSystem.render(state.tiles)

    // Subscribe to store changes
    this.unsubscribe = useTacticalCombatStore.subscribe((newState) => {
      this.syncWithState(newState)
    })

    // Initial sync
    this.syncWithState(state)

    // Set up input handlers
    this.setupInputHandlers()

    // Set up camera controls
    this.setupCamera()
  }

  private setupInputHandlers(): void {
    // Tile click detection
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Ignore right click (used for camera drag)
      if (pointer.rightButtonDown()) {
        this.startCameraDrag(pointer)
        return
      }

      // Convert screen to grid position
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      const gridPos = this.gridSystem.screenToGrid(worldPoint.x, worldPoint.y)

      if (gridPos) {
        useTacticalCombatStore.getState().selectTile(gridPos)
      }
    })

    // Tile hover detection
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Handle camera drag
      if (this.isDragging && pointer.rightButtonDown()) {
        this.updateCameraDrag(pointer)
        return
      }

      // Handle hover highlight
      const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
      const gridPos = this.gridSystem.screenToGrid(worldPoint.x, worldPoint.y)

      if (gridPos) {
        this.gridSystem.setHoverHighlight(gridPos)
        useTacticalCombatStore.getState().setHoveredTile(gridPos)
      } else {
        this.gridSystem.clearHoverHighlight()
        useTacticalCombatStore.getState().setHoveredTile(null)
      }
    })

    // End camera drag
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (pointer.rightButtonReleased()) {
        this.isDragging = false
      }
    })

    // Mouse wheel zoom
    this.input.on(
      'wheel',
      (
        _pointer: Phaser.Input.Pointer,
        _gameObjects: Phaser.GameObjects.GameObject[],
        _deltaX: number,
        deltaY: number
      ) => {
        const camera = this.cameras.main
        let newZoom = camera.zoom - deltaY * 0.001

        // Clamp zoom
        newZoom = Math.max(CAMERA_ZOOM_MIN, Math.min(CAMERA_ZOOM_MAX, newZoom))
        camera.setZoom(newZoom)
      }
    )
  }

  private startCameraDrag(pointer: Phaser.Input.Pointer): void {
    this.isDragging = true
    this.dragStartX = pointer.x
    this.dragStartY = pointer.y
    this.cameraStartX = this.cameras.main.scrollX
    this.cameraStartY = this.cameras.main.scrollY
  }

  private updateCameraDrag(pointer: Phaser.Input.Pointer): void {
    const camera = this.cameras.main
    const dx = (this.dragStartX - pointer.x) / camera.zoom
    const dy = (this.dragStartY - pointer.y) / camera.zoom

    camera.scrollX = this.cameraStartX + dx
    camera.scrollY = this.cameraStartY + dy
  }

  private setupCamera(): void {
    const camera = this.cameras.main

    // Set initial zoom
    camera.setZoom(1)

    // Calculate bounds for the isometric grid
    const boundsWidth = CANVAS_WIDTH * 2
    const boundsHeight = CANVAS_HEIGHT * 2
    camera.setBounds(
      -boundsWidth / 2,
      -boundsHeight / 4,
      boundsWidth,
      boundsHeight
    )
  }

  private syncWithState(
    state: ReturnType<typeof useTacticalCombatStore.getState>
  ): void {
    // Update grid if dimensions changed
    if (
      this.gridSystem.getDimensions().width !== state.gridWidth ||
      this.gridSystem.getDimensions().height !== state.gridHeight
    ) {
      this.gridSystem.resize(state.gridWidth, state.gridHeight, state.tiles)
    }

    // Update highlights
    this.gridSystem.clearHighlights()
    for (const highlight of state.highlightedTiles) {
      this.gridSystem.setTileHighlight(
        highlight.position,
        highlight.type as TileHighlightType
      )
    }

    // Update selected tile highlight
    if (state.selectedTile) {
      this.gridSystem.setTileHighlight(state.selectedTile, 'SELECTED')
    }

    // Update units
    this.syncUnits([...state.playerUnits, ...state.enemyUnits])
  }

  private syncUnits(units: TacticalUnit[]): void {
    // Track which units are still present
    const presentIds = new Set<string>()

    for (const unitData of units) {
      presentIds.add(unitData.id)

      let sprite = this.units.get(unitData.id)

      if (!sprite) {
        // Create new unit sprite
        sprite = this.spawnUnit(unitData)
      }

      // Update unit position
      const screenPos = this.gridSystem.gridToScreen(
        unitData.position.x,
        unitData.position.y
      )
      sprite.setPosition(screenPos.x, screenPos.y - 8) // Offset up to sit on tile

      // Update depth for proper sorting
      sprite.setDepth(
        DEPTH_LAYERS.UNIT + (unitData.position.x + unitData.position.y) * 0.01
      )

      // Visual feedback for active unit
      const activeUnitId = useTacticalCombatStore.getState().activeUnitId
      if (unitData.id === activeUnitId) {
        sprite.setTint(0xffff00) // Yellow tint for active unit
      } else {
        sprite.clearTint()
      }
    }

    // Remove units that are no longer present
    for (const [id, sprite] of this.units) {
      if (!presentIds.has(id)) {
        sprite.destroy()
        this.units.delete(id)
      }
    }
  }

  private spawnUnit(unitData: TacticalUnit): Phaser.GameObjects.Image {
    const screenPos = this.gridSystem.gridToScreen(
      unitData.position.x,
      unitData.position.y
    )

    const textureKey = unitData.isPlayer ? 'unit_player' : 'unit_enemy'
    const sprite = this.add.image(
      screenPos.x,
      screenPos.y - 8, // Offset up to sit on tile
      textureKey
    )

    sprite.setDepth(
      DEPTH_LAYERS.UNIT + (unitData.position.x + unitData.position.y) * 0.01
    )
    sprite.setInteractive()

    // Store unit data reference
    sprite.setData('unitId', unitData.id)

    this.units.set(unitData.id, sprite)

    return sprite
  }

  // Public method to get grid position from screen coordinates
  getGridPosition(screenX: number, screenY: number): GridPosition | null {
    const worldPoint = this.cameras.main.getWorldPoint(screenX, screenY)
    return this.gridSystem.screenToGrid(worldPoint.x, worldPoint.y)
  }

  shutdown(): void {
    // Cleanup subscriptions
    if (this.unsubscribe) {
      this.unsubscribe()
    }

    // Cleanup grid
    this.gridSystem.destroy()

    // Cleanup units
    for (const sprite of this.units.values()) {
      sprite.destroy()
    }
    this.units.clear()
  }
}
