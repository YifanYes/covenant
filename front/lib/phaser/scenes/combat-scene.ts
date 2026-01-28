import Phaser from 'phaser'
import { GridSystem } from '../systems/grid-system'
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CAMERA_ZOOM_MIN,
  CAMERA_ZOOM_MAX,
  CAMERA_ZOOM_DEFAULT,
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

    // Generate a unique texture key for this unit's sprite
    const customTextureKey = `unit_sprite_${unitData.templateId}`
    const fallbackTextureKey = unitData.isPlayer ? 'unit_player' : 'unit_enemy'

    // Check if we need to load a custom sprite
    const hasCustomSprite = unitData.spriteUrl && !this.loadingTextures.has(customTextureKey)
    const textureExists = this.textures.exists(customTextureKey)

    // Use existing texture or fallback
    const textureKey = textureExists ? customTextureKey : fallbackTextureKey

    const sprite = this.add.image(
      screenPos.x,
      screenPos.y - 8, // Offset up to sit on tile
      textureKey
    )

    // Scale sprite to fit tile (32x32 target size)
    sprite.setDisplaySize(32, 32)

    sprite.setDepth(
      DEPTH_LAYERS.UNIT + (unitData.position.x + unitData.position.y) * 0.01
    )
    sprite.setInteractive()

    // Store unit data reference
    sprite.setData('unitId', unitData.id)

    this.units.set(unitData.id, sprite)

    // Load custom sprite if available and not yet loaded
    if (hasCustomSprite && !textureExists && unitData.spriteUrl) {
      this.loadingTextures.add(customTextureKey)
      this.load.image(customTextureKey, unitData.spriteUrl)
      this.load.once('complete', () => {
        this.loadingTextures.delete(customTextureKey)
        // Update sprite texture once loaded
        const existingSprite = this.units.get(unitData.id)
        if (existingSprite && this.textures.exists(customTextureKey)) {
          existingSprite.setTexture(customTextureKey)
          existingSprite.setDisplaySize(32, 32)
        }
      })
      this.load.start()
    }

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
    this.loadingTextures.clear()
  }
}
