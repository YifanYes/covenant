import Phaser from 'phaser'
import { GridSystem } from '../systems/grid-system'
import { Unit } from '../entities/unit'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_DEFAULT
} from '../config'
import { useTacticalCombatStore } from '@/stores/tactical-combat.store'
import type {
  GridPosition,
  TacticalUnit,
  TileHighlightType
} from '@shared/types/tactical-combat.types'

export class CombatScene extends Phaser.Scene {
  private gridSystem!: GridSystem
  private units: Map<string, Unit> = new Map()
  private loadingTextures: Set<string> = new Set()
  private unsubscribe?: () => void

  // Camera drag state
  private isDragging = false
  private hasDragged = false // True if pointer moved enough to count as drag
  private dragStartX = 0
  private dragStartY = 0
  private cameraStartX = 0
  private cameraStartY = 0
  private readonly DRAG_THRESHOLD = 5 // Pixels before drag is recognized

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
    // Start drag on any pointer down
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.startCameraDrag(pointer)
    })

    // Handle pointer move for drag and hover
    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Check if any button is held (left=1, right=2, middle=4)
      const isAnyButtonHeld = pointer.buttons !== 0

      if (this.isDragging && isAnyButtonHeld) {
        // Check if we've moved enough to count as a drag
        const dx = Math.abs(pointer.x - this.dragStartX)
        const dy = Math.abs(pointer.y - this.dragStartY)

        if (dx > this.DRAG_THRESHOLD || dy > this.DRAG_THRESHOLD) {
          this.hasDragged = true
        }

        if (this.hasDragged) {
          this.updateCameraDrag(pointer)
          return
        }
      }

      // End drag if buttons released
      if (this.isDragging && !isAnyButtonHeld) {
        this.isDragging = false
        this.hasDragged = false
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

    // Handle pointer up - select tile if it was a click (not a drag)
    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isDragging && !this.hasDragged && pointer.leftButtonReleased()) {
        // This was a click, not a drag - select the tile
        const worldPoint = this.cameras.main.getWorldPoint(pointer.x, pointer.y)
        const gridPos = this.gridSystem.screenToGrid(worldPoint.x, worldPoint.y)

        if (gridPos) {
          useTacticalCombatStore.getState().selectTile(gridPos)
        }
      }

      this.isDragging = false
      this.hasDragged = false
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
    camera.setZoom(CAMERA_ZOOM_DEFAULT)

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
    const state = useTacticalCombatStore.getState()
    const { activeUnitId, selectedTile, phase } = state

    // Track which units are still present
    const presentIds = new Set<string>()

    for (const unitData of units) {
      presentIds.add(unitData.id)

      let unit = this.units.get(unitData.id)

      if (!unit) {
        // Create new unit
        unit = this.spawnUnit(unitData)
      }

      // Update unit position
      const screenPos = this.gridSystem.gridToScreen(
        unitData.position.x,
        unitData.position.y
      )
      unit.updateGridPosition(screenPos, unitData.position)

      // Update unit state from store data
      unit.updateFromState(unitData)

      // Determine visual state based on game state
      if (unitData.id === activeUnitId) {
        unit.setVisualState('active')
      } else if (
        selectedTile &&
        unitData.position.x === selectedTile.x &&
        unitData.position.y === selectedTile.y
      ) {
        unit.setVisualState('selected')
      } else if (
        phase === 'select_target' &&
        !unitData.isPlayer
      ) {
        // In attack targeting phase, show enemies as targetable
        unit.setVisualState('targetable')
      } else {
        unit.setVisualState('idle')
      }
    }

    // Remove units that are no longer present
    for (const [id, unit] of this.units) {
      if (!presentIds.has(id)) {
        unit.destroy()
        this.units.delete(id)
      }
    }
  }

  private spawnUnit(unitData: TacticalUnit): Unit {
    const screenPos = this.gridSystem.gridToScreen(
      unitData.position.x,
      unitData.position.y
    )

    // Create new Unit instance
    const unit = new Unit(this, unitData, screenPos)

    this.units.set(unitData.id, unit)

    // Handle custom sprite loading if available
    if (unitData.spriteUrl) {
      const customTextureKey = `unit_sprite_${unitData.templateId}`
      const hasTexture = this.textures.exists(customTextureKey)
      const isLoading = this.loadingTextures.has(customTextureKey)

      if (!hasTexture && !isLoading) {
        this.loadingTextures.add(customTextureKey)
        this.load.image(customTextureKey, unitData.spriteUrl)
        this.load.once('complete', () => {
          this.loadingTextures.delete(customTextureKey)
          // Update sprite texture once loaded
          const existingUnit = this.units.get(unitData.id)
          if (existingUnit && this.textures.exists(customTextureKey)) {
            existingUnit.setCustomSprite(customTextureKey)
          }
        })
        this.load.start()
      } else if (hasTexture) {
        unit.setCustomSprite(customTextureKey)
      }
    }

    return unit
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
    for (const unit of this.units.values()) {
      unit.destroy()
    }
    this.units.clear()
    this.loadingTextures.clear()
  }

  // Get unit at a specific grid position
  getUnitAtPosition(gridPos: GridPosition): Unit | null {
    for (const unit of this.units.values()) {
      if (unit.isAtPosition(gridPos)) {
        return unit
      }
    }
    return null
  }

  // Get all units
  getAllUnits(): Unit[] {
    return Array.from(this.units.values())
  }
}
