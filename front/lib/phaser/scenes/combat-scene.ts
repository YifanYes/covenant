import Phaser from 'phaser'
import { GridSystem } from '../systems/grid-system'
import { Unit } from '../entities/unit'
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
  private units: Map<string, Unit> = new Map()
  private loadingTextures: Set<string> = new Set()
  private unsubscribe?: () => void
  private isAnimating = false
  private isAttackAnimating = false
  private isDoctrineAnimating = false
  private floatingTexts: Phaser.GameObjects.Text[] = []
  private spellEffects: Phaser.GameObjects.Graphics[] = []

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

    // Mark scene as ready
    useTacticalCombatStore.getState().setSceneReady(true)
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

  /**
   * Check if the scene is still active and safe to use.
   */
  private isSceneActive(): boolean {
    // Must check scene.manager exists before calling isActive() since
    // isActive() internally accesses manager which may be null during initialization
    return !!(this.sys && this.tweens && this.scene?.manager && this.scene.isActive())
  }

  private syncWithState(
    state: ReturnType<typeof useTacticalCombatStore.getState>
  ): void {
    // Guard against calls after scene destruction
    if (!this.isSceneActive()) {
      console.debug('[CombatScene] syncWithState skipped: scene inactive')
      return
    }

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

    // Check for movement animation state
    if (state.phase === 'animating' && state.animatingUnitId && state.animationPath && !this.isAnimating) {
      this.handleMovementAnimation(state.animatingUnitId, state.animationPath)
      return // Don't sync units during animation - unit will update itself
    }

    // Check for attack animation state
    if (state.phase === 'animating' && state.isAttackAnimating && state.attackAnimationData && !this.isAttackAnimating) {
      this.handleAttackAnimation(state.attackAnimationData)
      return // Don't sync units during animation
    }

    // Check for doctrine animation state
    if (state.phase === 'animating' && state.isDoctrineAnimating && state.doctrineAnimationData && !this.isDoctrineAnimating) {
      this.handleDoctrineAnimation(state.doctrineAnimationData)
      return // Don't sync units during animation
    }

    // Update units (skip during animation as the unit is updating itself)
    if (!this.isAnimating && !this.isAttackAnimating && !this.isDoctrineAnimating) {
      this.syncUnits([...state.playerUnits, ...state.enemyUnits])
    }

    // Wake up the game loop to ensure render happens immediately
    // This prevents browser rAF throttling from delaying unit visibility
    if (this.game?.loop) {
      this.game.loop.wake()
    }
  }

  private async handleMovementAnimation(unitId: string, path: GridPosition[]): Promise<void> {
    const unit = this.units.get(unitId)
    if (!unit) {
      // Unit not found, complete animation immediately
      useTacticalCombatStore.getState().completeAnimation()
      return
    }

    this.isAnimating = true

    try {
      // Perform the animation
      await unit.animateMovement(path, (x, y) => this.gridSystem.gridToScreen(x, y))
    } finally {
      this.isAnimating = false
      // Signal animation complete to store
      useTacticalCombatStore.getState().completeAnimation()
    }
  }

  private async handleAttackAnimation(data: {
    attackerId: string
    targetId: string
    damageDealt: number
    targetKilled: boolean
    damageToAttacker: number
    attackerKilled: boolean
  }): Promise<void> {
    const attacker = this.units.get(data.attackerId)
    const target = this.units.get(data.targetId)

    if (!attacker || !target) {
      // Units not found, complete animation immediately
      useTacticalCombatStore.getState().completeAttackAnimation()
      return
    }

    this.isAttackAnimating = true

    try {
      // Get target position for attack animation
      const targetData = target.getUnitData()

      // Play attack animation on attacker
      await attacker.animateAttack(
        targetData.position,
        (x, y) => this.gridSystem.gridToScreen(x, y)
      )

      // Play damage animation on target and show damage number
      if (data.damageDealt > 0) {
        const damagePromise = target.animateDamage(data.damageDealt)
        this.showDamageNumber(target, data.damageDealt)
        this.playHitSparks(target, this.getShakeIntensity(data.damageDealt, data.targetKilled))
        this.shakeCamera(this.getShakeIntensity(data.damageDealt, data.targetKilled))
        await damagePromise
      }

      // Play death animation if target killed
      if (data.targetKilled) {
        await target.animateDeath()
      }

      // Handle counter-attack damage to attacker if any
      if (data.damageToAttacker > 0) {
        const attackerDamagePromise = attacker.animateDamage(data.damageToAttacker)
        this.showDamageNumber(attacker, data.damageToAttacker)
        this.playHitSparks(attacker, this.getShakeIntensity(data.damageToAttacker, data.attackerKilled))
        this.shakeCamera(this.getShakeIntensity(data.damageToAttacker, data.attackerKilled))
        await attackerDamagePromise

        if (data.attackerKilled) {
          await attacker.animateDeath()
        }
      }
    } finally {
      this.isAttackAnimating = false
      // Signal animation complete to store
      useTacticalCombatStore.getState().completeAttackAnimation()
    }
  }

  private async handleDoctrineAnimation(data: {
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
  }): Promise<void> {
    const caster = this.units.get(data.casterId)

    if (!caster) {
      // Caster not found - log warning and ensure animation state is reset
      console.warn(`[CombatScene] Caster unit not found for doctrine animation: ${data.casterId}`)
      this.isDoctrineAnimating = false
      useTacticalCombatStore.getState().completeDoctrineAnimation()
      return
    }

    this.isDoctrineAnimating = true

    try {
      // Play cast animation on caster (flash effect)
      await this.playCastEffect(caster)

      // Show AoE effect on affected tiles
      await this.playAoEEffect(data.affectedTiles, data.doctrineId)

      // Apply effects to each affected unit
      // Track total damage for a combined shake effect
      let maxDamage = 0
      let anyKilled = false

      for (const effect of data.effects) {
        const targetUnit = this.units.get(effect.unitId)
        if (!targetUnit) continue

        // Show damage/heal numbers and play animations
        if (effect.damageDealt && effect.damageDealt > 0) {
          const damagePromise = targetUnit.animateDamage(effect.damageDealt)
          this.showDamageNumber(targetUnit, effect.damageDealt)
          this.playHitSparks(targetUnit, this.getShakeIntensity(effect.damageDealt, effect.killed ?? false))
          maxDamage = Math.max(maxDamage, effect.damageDealt)
          await damagePromise
        }

        if (effect.healthRestored && effect.healthRestored > 0) {
          this.showHealNumber(targetUnit, effect.healthRestored)
        }

        if (effect.statusApplied) {
          this.showStatusText(targetUnit, effect.statusApplied)
        }

        // Play death animation if killed
        if (effect.killed) {
          anyKilled = true
          await targetUnit.animateDeath()
        }
      }

      // Single shake for the entire doctrine effect (based on max damage dealt)
      if (maxDamage > 0) {
        this.shakeCamera(this.getShakeIntensity(maxDamage, anyKilled))
      }
    } finally {
      this.isDoctrineAnimating = false
      // Signal animation complete to store
      useTacticalCombatStore.getState().completeDoctrineAnimation()
    }
  }

  /**
   * Shake the camera for impact feedback.
   * @param intensity - 'light' for small hits, 'medium' for normal, 'heavy' for crits/deaths
   */
  private shakeCamera(intensity: 'light' | 'medium' | 'heavy'): void {
    if (!this.isSceneActive()) return

    const config = {
      light: { intensity: 0.003, duration: 80 },
      medium: { intensity: 0.006, duration: 120 },
      heavy: { intensity: 0.012, duration: 180 }
    }

    const { intensity: i, duration } = config[intensity]
    this.cameras.main.shake(duration, i)
  }

  /**
   * Determine shake intensity based on damage dealt.
   */
  private getShakeIntensity(damage: number, isKill: boolean): 'light' | 'medium' | 'heavy' {
    if (isKill) return 'heavy'
    if (damage >= 15) return 'heavy'
    if (damage >= 8) return 'medium'
    return 'light'
  }

  /**
   * Play hit spark particles at a unit's position.
   * @param unit The unit being hit
   * @param intensity How many particles to emit (scales with damage)
   */
  private playHitSparks(unit: Unit, intensity: 'light' | 'medium' | 'heavy' = 'medium'): void {
    if (!this.isSceneActive()) return

    const particleCount = { light: 6, medium: 10, heavy: 16 }[intensity]
    const speedRange = { light: [80, 120], medium: [100, 160], heavy: [120, 200] }[intensity]

    // Create particle emitter at unit position
    const particles = this.add.particles(unit.x, unit.y - 10, 'particle_spark', {
      lifespan: { min: 200, max: 400 },
      speed: { min: speedRange[0], max: speedRange[1] },
      angle: { min: 200, max: 340 }, // Upward spread
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 300,
      tint: [0xffffff, 0xffff88, 0xffaa44], // White to yellow to orange
      emitting: false
    })

    particles.setDepth(DEPTH_LAYERS.EFFECTS)

    // Emit burst of particles
    particles.explode(particleCount)

    // Clean up after particles fade
    this.time.delayedCall(500, () => {
      particles.destroy()
    })
  }

  /**
   * Play a casting effect on the caster unit (flash/glow).
   */
  private async playCastEffect(unit: Unit): Promise<void> {
    if (!this.isSceneActive()) {
      console.debug('[CombatScene] playCastEffect skipped: scene inactive')
      return
    }

    return new Promise((resolve) => {
      // Create a flash effect
      const flash = this.add.graphics()
      flash.fillStyle(0xa855f7, 0.5) // Purple for doctrine
      flash.fillCircle(unit.x, unit.y, 30)
      flash.setDepth(DEPTH_LAYERS.EFFECTS)

      // Animate the flash expanding and fading
      this.tweens.add({
        targets: flash,
        alpha: 0,
        scaleX: 2,
        scaleY: 2,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => {
          flash.destroy()
          resolve()
        }
      })
    })
  }

  /**
   * Play an AoE effect on the affected tiles.
   */
  private async playAoEEffect(tiles: GridPosition[], doctrineId: string): Promise<void> {
    if (tiles.length === 0) return
    if (!this.isSceneActive()) {
      console.debug('[CombatScene] playAoEEffect skipped: scene inactive')
      return
    }

    return new Promise((resolve) => {
      // Determine color based on doctrine (could be expanded)
      let color = 0xa855f7 // Default purple

      // Fire-based doctrines
      if (doctrineId.includes('fire') || doctrineId.includes('igneous') || doctrineId.includes('combustion')) {
        color = 0xff6b35 // Orange/fire
      }
      // Ice-based doctrines
      else if (doctrineId.includes('ice') || doctrineId.includes('frost')) {
        color = 0x4fc3f7 // Light blue
      }
      // Lightning-based doctrines
      else if (doctrineId.includes('lightning') || doctrineId.includes('storm')) {
        color = 0xffeb3b // Yellow
      }
      // Dark/chaos doctrines
      else if (doctrineId.includes('black') || doctrineId.includes('void') || doctrineId.includes('disruption')) {
        color = 0x7b1fa2 // Dark purple
      }

      const graphics = this.add.graphics()
      this.spellEffects.push(graphics)

      // Draw effect on each affected tile
      for (const tile of tiles) {
        const screenPos = this.gridSystem.gridToScreen(tile.x, tile.y)
        graphics.fillStyle(color, 0.6)
        graphics.fillCircle(screenPos.x, screenPos.y - 16, 25)
      }

      graphics.setDepth(DEPTH_LAYERS.EFFECTS)

      // Animate and fade
      this.tweens.add({
        targets: graphics,
        alpha: 0,
        duration: 500,
        ease: 'Quad.easeOut',
        onComplete: () => {
          graphics.destroy()
          const index = this.spellEffects.indexOf(graphics)
          if (index > -1) {
            this.spellEffects.splice(index, 1)
          }
          resolve()
        }
      })
    })
  }

  /**
   * Show a status effect text above a unit.
   */
  private showStatusText(unit: Unit, status: string): void {
    if (!this.isSceneActive()) {
      console.debug('[CombatScene] showStatusText skipped: scene inactive')
      return
    }

    const text = this.add.text(
      unit.x,
      unit.y - 50,
      status.toUpperCase(),
      {
        fontFamily: 'monospace',
        fontSize: '12px',
        fontStyle: 'bold',
        color: '#a855f7',
        stroke: '#000000',
        strokeThickness: 2
      }
    )
    text.setOrigin(0.5, 0.5)
    text.setDepth(DEPTH_LAYERS.UI)

    this.floatingTexts.push(text)

    // Animate the text floating up and fading
    this.tweens.add({
      targets: text,
      y: text.y - 30,
      alpha: 0,
      duration: 1200,
      ease: 'Quad.easeOut',
      onComplete: () => {
        text.destroy()
        const index = this.floatingTexts.indexOf(text)
        if (index > -1) {
          this.floatingTexts.splice(index, 1)
        }
      }
    })
  }

  /**
   * Show a floating damage number above a unit.
   */
  private showDamageNumber(unit: Unit, damage: number): void {
    if (!this.isSceneActive()) {
      console.debug('[CombatScene] showDamageNumber skipped: scene inactive')
      return
    }

    const text = this.add.text(
      unit.x,
      unit.y - 30,
      `-${damage}`,
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ff4444',
        stroke: '#000000',
        strokeThickness: 3
      }
    )
    text.setOrigin(0.5, 0.5)
    text.setDepth(DEPTH_LAYERS.UI)

    this.floatingTexts.push(text)

    // Animate the text floating up and fading
    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => {
        text.destroy()
        const index = this.floatingTexts.indexOf(text)
        if (index > -1) {
          this.floatingTexts.splice(index, 1)
        }
      }
    })
  }

  /**
   * Show a healing number above a unit (green, positive).
   */
  showHealNumber(unit: Unit, amount: number): void {
    if (!this.isSceneActive()) {
      console.debug('[CombatScene] showHealNumber skipped: scene inactive')
      return
    }

    const text = this.add.text(
      unit.x,
      unit.y - 30,
      `+${amount}`,
      {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#44ff44',
        stroke: '#000000',
        strokeThickness: 3
      }
    )
    text.setOrigin(0.5, 0.5)
    text.setDepth(DEPTH_LAYERS.UI)

    this.floatingTexts.push(text)

    // Animate the text floating up and fading
    this.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => {
        text.destroy()
        const index = this.floatingTexts.indexOf(text)
        if (index > -1) {
          this.floatingTexts.splice(index, 1)
        }
      }
    })
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
          // Wake up game loop to render the new texture immediately
          if (this.game?.loop) {
            this.game.loop.wake()
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
    // Mark scene as not ready
    useTacticalCombatStore.getState().setSceneReady(false)

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

    // Cleanup floating texts
    for (const text of this.floatingTexts) {
      text.destroy()
    }
    this.floatingTexts = []

    // Cleanup spell effects
    for (const effect of this.spellEffects) {
      effect.destroy()
    }
    this.spellEffects = []
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
