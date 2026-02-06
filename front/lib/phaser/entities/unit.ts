import Phaser from 'phaser'
import { DEPTH_LAYERS, ANIMATION_DURATION } from '../config'
import type { TacticalUnit, GridPosition } from '@shared/types/tactical-combat.types'
import type { StatusEffect } from '@shared/types/doctrine.types'

// Unit visual states
export type UnitVisualState = 'idle' | 'selected' | 'active' | 'targetable'

export class Unit extends Phaser.GameObjects.Container {
  // Child game objects
  private sprite: Phaser.GameObjects.Image
  private healthBarBg: Phaser.GameObjects.Rectangle
  private healthBarFill: Phaser.GameObjects.Rectangle

  // Unit data
  private unitData: TacticalUnit
  private visualState: UnitVisualState = 'idle'

  // Animation
  private bounceTween: Phaser.Tweens.Tween | null = null
  private breathingTween: Phaser.Tweens.Tween | null = null
  private activeTweens: Set<Phaser.Tweens.Tween> = new Set()
  private spriteBaseY: number = 0
  private spriteBaseScaleX: number = 1
  private spriteBaseScaleY: number = 1

  // Status effect overlays
  private statusEffectEmitters: Map<StatusEffect, Phaser.GameObjects.Particles.ParticleEmitter> = new Map()
  private stunOrbitTween: Phaser.Tweens.Tween | null = null
  private stunStars: Phaser.GameObjects.Image[] = []

  // Configuration
  private readonly SPRITE_SIZE = 32
  private readonly HEALTH_BAR_WIDTH = 28
  private readonly HEALTH_BAR_HEIGHT = 4
  private readonly HEALTH_BAR_OFFSET_Y = -20
  private readonly BOUNCE_AMOUNT = 4
  private readonly BOUNCE_DURATION = 600
  private readonly BREATHING_SCALE = 0.04
  private readonly BREATHING_DURATION = 2000

  constructor(scene: Phaser.Scene, unitData: TacticalUnit, screenPos: { x: number; y: number }) {
    super(scene, screenPos.x, screenPos.y - 8) // Offset up to sit on tile

    this.unitData = unitData

    // Determine texture key
    const textureKey = unitData.isPlayer ? 'unit_player' : 'unit_enemy'

    // Create main sprite
    this.sprite = scene.add.image(0, 0, textureKey)
    this.sprite.setDisplaySize(this.SPRITE_SIZE, this.SPRITE_SIZE)
    // Store base scale for breathing animation
    this.spriteBaseScaleX = this.sprite.scaleX
    this.spriteBaseScaleY = this.sprite.scaleY
    this.add(this.sprite)

    // Create health bar background
    this.healthBarBg = scene.add.rectangle(
      0,
      this.HEALTH_BAR_OFFSET_Y,
      this.HEALTH_BAR_WIDTH,
      this.HEALTH_BAR_HEIGHT,
      0x333333
    )
    this.add(this.healthBarBg)

    // Create health bar fill
    this.healthBarFill = scene.add.rectangle(
      0,
      this.HEALTH_BAR_OFFSET_Y,
      this.HEALTH_BAR_WIDTH,
      this.HEALTH_BAR_HEIGHT,
      0x22c55e // Green
    )
    this.add(this.healthBarFill)

    // Initialize health bar
    this.updateHealthBar()

    // Store the sprite's base Y position for bounce animation
    this.spriteBaseY = this.sprite.y

    // Make interactive
    this.setSize(this.SPRITE_SIZE, this.SPRITE_SIZE)
    this.setInteractive()

    // Store unit ID for click detection
    this.setData('unitId', unitData.id)
    this.setData('isPlayer', unitData.isPlayer)

    // Start idle breathing animation
    this.startBreathing()

    // Add to scene
    scene.add.existing(this)
  }

  private startBounce(): void {
    // Stop any existing bounce
    this.stopBounce()

    // Create a looping bounce animation on the sprite
    this.bounceTween = this.scene.tweens.add({
      targets: this.sprite,
      y: this.spriteBaseY - this.BOUNCE_AMOUNT,
      duration: this.BOUNCE_DURATION / 2,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  private stopBounce(): void {
    if (this.bounceTween) {
      this.bounceTween.destroy()
      this.bounceTween = null
      // Reset sprite to base position
      this.sprite.setY(this.spriteBaseY)
    }
  }

  private startBreathing(): void {
    // Stop any existing breathing
    this.stopBreathing()

    // Create a subtle scale animation to simulate breathing
    // Use base scale values to work with custom sprites of any size
    this.breathingTween = this.scene.tweens.add({
      targets: this.sprite,
      scaleX: this.spriteBaseScaleX * (1 + this.BREATHING_SCALE),
      scaleY: this.spriteBaseScaleY * (1 + this.BREATHING_SCALE),
      duration: this.BREATHING_DURATION / 2,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1
    })
  }

  private stopBreathing(): void {
    if (this.breathingTween) {
      this.breathingTween.destroy()
      this.breathingTween = null
      // Reset sprite to base scale
      this.sprite.setScale(this.spriteBaseScaleX, this.spriteBaseScaleY)
    }
  }

  /**
   * Create a tween tracked for cleanup on unit destruction.
   */
  private trackTween(config: Phaser.Types.Tweens.TweenBuilderConfig): Phaser.Tweens.Tween {
    const tween = this.scene.tweens.add(config)
    this.activeTweens.add(tween)
    tween.once('complete', () => this.activeTweens.delete(tween))
    return tween
  }

  private updateHealthBar(): void {
    // Check if health bar components are still valid (not destroyed)
    if (!this.healthBarFill?.active || !this.healthBarBg?.active) return

    const healthPercent = this.unitData.maxHealth > 0
      ? this.unitData.currentHealth / this.unitData.maxHealth
      : 0

    // Update fill width
    const fillWidth = Math.max(0, this.HEALTH_BAR_WIDTH * healthPercent)
    this.healthBarFill.setSize(fillWidth, this.HEALTH_BAR_HEIGHT)

    // Adjust position so it fills from left
    this.healthBarFill.setX((fillWidth - this.HEALTH_BAR_WIDTH) / 2)

    // Update color based on health
    let color = 0x22c55e // Green
    if (healthPercent <= 0.25) {
      color = 0xef4444 // Red
    } else if (healthPercent <= 0.5) {
      color = 0xf59e0b // Amber/yellow
    }
    this.healthBarFill.setFillStyle(color)
  }

  // Update unit from state data
  updateFromState(unitData: TacticalUnit): void {
    this.unitData = unitData
    this.updateHealthBar()
    this.updateStatusEffects()
  }

  // Set visual state
  setVisualState(state: UnitVisualState): void {
    this.visualState = state

    // Reset all indicators
    this.stopBounce()
    this.stopBreathing()
    this.sprite.clearTint()

    switch (state) {
      case 'selected':
        // Gentle bounce for selected unit
        this.startBounce()
        break
      case 'active':
        // Bounce animation for active unit (their turn)
        this.startBounce()
        break
      case 'targetable':
        // Slight red tint to indicate targetable enemy
        this.sprite.setTint(0xffaaaa)
        // Continue breathing while targetable
        this.startBreathing()
        break
      case 'idle':
      default:
        // Idle breathing animation
        this.startBreathing()
        break
    }
  }

  // Check if this unit is at a specific grid position
  isAtPosition(pos: GridPosition): boolean {
    return this.unitData.position.x === pos.x && this.unitData.position.y === pos.y
  }

  // Get unit data
  getUnitData(): TacticalUnit {
    return this.unitData
  }

  // Get unit ID
  getUnitId(): string {
    return this.unitData.id
  }

  // Check if unit is player-controlled
  isPlayerUnit(): boolean {
    return this.unitData.isPlayer
  }

  // Update position with depth sorting
  updateGridPosition(screenPos: { x: number; y: number }, gridPos: GridPosition): void {
    this.setPosition(screenPos.x, screenPos.y - 8)
    this.setDepth(DEPTH_LAYERS.UNIT + (gridPos.x + gridPos.y) * 0.01)
    this.updateStatusEffectPositions()
  }

  // Set custom sprite texture
  setCustomSprite(textureKey: string): void {
    // Stop breathing to avoid animation conflicts
    const wasBreathing = this.breathingTween !== null
    this.stopBreathing()

    this.sprite.setTexture(textureKey)
    this.sprite.setDisplaySize(this.SPRITE_SIZE, this.SPRITE_SIZE)

    // Update base scale for the new texture
    this.spriteBaseScaleX = this.sprite.scaleX
    this.spriteBaseScaleY = this.sprite.scaleY

    // Restart breathing if it was active
    if (wasBreathing) {
      this.startBreathing()
    }
  }

  /**
   * Animate the unit moving along a path.
   * @param path Array of grid positions forming the movement path
   * @param gridToScreen Function to convert grid position to screen coordinates
   * @returns Promise that resolves when the animation completes
   */
  async animateMovement(
    path: GridPosition[],
    gridToScreen: (x: number, y: number) => { x: number; y: number }
  ): Promise<void> {
    if (path.length < 2) return

    // Skip the starting position (index 0), animate through rest of path
    for (let i = 1; i < path.length; i++) {
      const gridPos = path[i]
      const screenPos = gridToScreen(gridPos.x, gridPos.y)

      // Update depth during movement for proper layering
      const newDepth = DEPTH_LAYERS.UNIT + (gridPos.x + gridPos.y) * 0.01

      await new Promise<void>((resolve) => {
        this.trackTween({
          targets: this,
          x: screenPos.x,
          y: screenPos.y - 8, // Apply vertical offset
          duration: ANIMATION_DURATION.UNIT_MOVE,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            // Update depth during tween for smooth transitions
            this.setDepth(newDepth)
            // Update status effect positions to follow unit
            this.updateStatusEffectPositions()
          },
          onComplete: () => {
            // Update internal position tracking
            this.unitData = {
              ...this.unitData,
              position: gridPos
            }
            resolve()
          }
        })
      })
    }
  }

  /**
   * Animate an attack toward a target position.
   * @param targetPos Target grid position
   * @param gridToScreen Function to convert grid position to screen coordinates
   * @returns Promise that resolves when the animation completes
   */
  async animateAttack(
    targetPos: GridPosition,
    gridToScreen: (x: number, y: number) => { x: number; y: number }
  ): Promise<void> {
    const targetScreen = gridToScreen(targetPos.x, targetPos.y)
    const originalX = this.x
    const originalY = this.y

    // Calculate direction to target
    const dx = targetScreen.x - originalX
    const dy = (targetScreen.y - 8) - originalY

    // Normalize and scale for lunge distance
    const distance = Math.sqrt(dx * dx + dy * dy)
    const lungeDistance = Math.min(distance * 0.4, 20) // Lunge 40% toward target, max 20px
    const normalizedDx = (dx / distance) * lungeDistance
    const normalizedDy = (dy / distance) * lungeDistance

    // Lunge forward
    await new Promise<void>((resolve) => {
      this.trackTween({
        targets: this,
        x: originalX + normalizedDx,
        y: originalY + normalizedDy,
        duration: ANIMATION_DURATION.UNIT_ATTACK / 2,
        ease: 'Quad.easeOut',
        onUpdate: () => this.updateStatusEffectPositions(),
        onComplete: () => resolve()
      })
    })

    // Return to original position
    await new Promise<void>((resolve) => {
      this.trackTween({
        targets: this,
        x: originalX,
        y: originalY,
        duration: ANIMATION_DURATION.UNIT_ATTACK / 2,
        ease: 'Quad.easeIn',
        onUpdate: () => this.updateStatusEffectPositions(),
        onComplete: () => resolve()
      })
    })
  }

  /**
   * Animate taking damage (flash red and shake).
   * @param damage Amount of damage taken
   * @returns Promise that resolves when the animation completes
   */
  async animateDamage(damage: number): Promise<void> {
    if (damage <= 0) return

    // Flash red
    this.sprite.setTint(0xff0000)

    // Shake effect
    const originalX = this.sprite.x

    await new Promise<void>((resolve) => {
      this.trackTween({
        targets: this.sprite,
        x: [originalX - 3, originalX + 3, originalX - 2, originalX + 2, originalX],
        duration: 200,
        ease: 'Linear',
        onComplete: () => {
          // Clear tint after shake
          this.sprite.clearTint()
          resolve()
        }
      })
    })
  }

  /**
   * Animate death (fade out and fall).
   * @returns Promise that resolves when the animation completes
   */
  async animateDeath(): Promise<void> {
    await new Promise<void>((resolve) => {
      this.trackTween({
        targets: this,
        alpha: 0,
        y: this.y + 10,
        angle: 45,
        duration: 400,
        ease: 'Quad.easeIn',
        onComplete: () => resolve()
      })
    })
  }

  /**
   * Update status effect visual overlays based on activeEffects.
   */
  private updateStatusEffects(): void {
    const activeEffectTypes = new Set(
      this.unitData.activeEffects?.map((e) => e.effect) ?? []
    )

    // Remove effects that are no longer active
    for (const [effectType, emitter] of this.statusEffectEmitters) {
      if (!activeEffectTypes.has(effectType)) {
        emitter.stop()
        this.scene.time.delayedCall(500, () => {
          emitter.destroy()
        })
        this.statusEffectEmitters.delete(effectType)
      }
    }

    // Special handling for stunned (uses orbiting stars, not particle emitter)
    if (!activeEffectTypes.has('STUNNED')) {
      this.clearStunEffect()
    }

    // Add new effects
    for (const effectType of activeEffectTypes) {
      if (effectType === 'STUNNED') {
        if (this.stunStars.length === 0) {
          this.createStunEffect()
        }
        continue
      }

      if (!this.statusEffectEmitters.has(effectType)) {
        this.createStatusEffectEmitter(effectType)
      }
    }
  }

  /**
   * Create a particle emitter for a status effect.
   */
  private createStatusEffectEmitter(effectType: StatusEffect): void {
    // Skip DOCTRINE_ACTIVE as it's not a visual status
    if (effectType === 'DOCTRINE_ACTIVE' || effectType === 'STUNNED') return

    let emitter: Phaser.GameObjects.Particles.ParticleEmitter

    switch (effectType) {
      case 'BURNING':
        emitter = this.scene.add.particles(this.x, this.y - 8, 'particle_flame', {
          lifespan: { min: 400, max: 700 },
          speed: { min: 20, max: 40 },
          angle: { min: 250, max: 290 }, // Upward
          scale: { start: 0.8, end: 0.2 },
          alpha: { start: 0.9, end: 0 },
          frequency: 80,
          quantity: 1,
          emitZone: {
            type: 'random',
            source: new Phaser.Geom.Rectangle(-8, -4, 16, 8)
          } as Phaser.Types.GameObjects.Particles.EmitZoneData,
          tint: [0xff6b35, 0xff4500, 0xffa500]
        })
        break

      case 'POISONED':
        emitter = this.scene.add.particles(this.x, this.y - 16, 'particle_poison', {
          lifespan: { min: 500, max: 800 },
          speed: { min: 15, max: 30 },
          angle: { min: 70, max: 110 }, // Downward
          scale: { start: 0.7, end: 0.3 },
          alpha: { start: 0.8, end: 0 },
          frequency: 150,
          quantity: 1,
          emitZone: {
            type: 'random',
            source: new Phaser.Geom.Rectangle(-6, -12, 12, 4)
          } as Phaser.Types.GameObjects.Particles.EmitZoneData,
          tint: [0x22c55e, 0x16a34a, 0x4ade80]
        })
        break

      case 'PURIFIED':
        emitter = this.scene.add.particles(this.x, this.y - 8, 'particle_holy', {
          lifespan: { min: 600, max: 900 },
          speed: { min: 10, max: 25 },
          angle: { min: 0, max: 360 }, // All directions
          scale: { start: 0.6, end: 0 },
          alpha: { start: 1, end: 0 },
          frequency: 120,
          quantity: 1,
          emitZone: {
            type: 'random',
            source: new Phaser.Geom.Circle(0, 0, 14)
          } as Phaser.Types.GameObjects.Particles.EmitZoneData,
          tint: [0xffd700, 0xffec8b, 0xfffacd]
        })
        break

      case 'IMMOBILIZED':
        emitter = this.scene.add.particles(this.x, this.y + 6, 'particle_ice', {
          lifespan: { min: 800, max: 1200 },
          speed: { min: 5, max: 15 },
          angle: { min: 240, max: 300 }, // Slightly upward
          scale: { start: 0.7, end: 0.4 },
          alpha: { start: 0.9, end: 0.3 },
          frequency: 200,
          quantity: 1,
          emitZone: {
            type: 'random',
            source: new Phaser.Geom.Rectangle(-10, -2, 20, 4)
          } as Phaser.Types.GameObjects.Particles.EmitZoneData,
          tint: [0x7dd3fc, 0xbae6fd, 0xe0f2fe]
        })
        break

      default:
        return
    }

    emitter.setDepth(DEPTH_LAYERS.EFFECTS)
    this.statusEffectEmitters.set(effectType, emitter)
  }

  /**
   * Create orbiting stars effect for stunned status.
   */
  private createStunEffect(): void {
    const numStars = 3
    const orbitRadius = 12
    const orbitCenterY = -24 // Above the unit

    for (let i = 0; i < numStars; i++) {
      const angle = (i / numStars) * Math.PI * 2
      const star = this.scene.add.image(
        this.x + Math.cos(angle) * orbitRadius,
        this.y + orbitCenterY + Math.sin(angle) * (orbitRadius * 0.5),
        'particle_stun'
      )
      star.setScale(0.8)
      star.setDepth(DEPTH_LAYERS.EFFECTS)
      star.setData('orbitAngle', angle)
      this.stunStars.push(star)
    }

    // Create orbit animation
    this.stunOrbitTween = this.scene.tweens.addCounter({
      from: 0,
      to: Math.PI * 2,
      duration: 1500,
      repeat: -1,
      onUpdate: (tween) => {
        const progress = tween.getValue() ?? 0
        this.stunStars.forEach((star, i) => {
          const baseAngle = (i / numStars) * Math.PI * 2
          const currentAngle = baseAngle + progress
          star.setPosition(
            this.x + Math.cos(currentAngle) * orbitRadius,
            this.y + orbitCenterY + Math.sin(currentAngle) * (orbitRadius * 0.5)
          )
          // Slight scale pulse
          star.setScale(0.7 + Math.sin(progress * 2 + i) * 0.15)
        })
      }
    })
  }

  /**
   * Clear the stunned effect visuals.
   */
  private clearStunEffect(): void {
    if (this.stunOrbitTween) {
      this.stunOrbitTween.stop()
      this.stunOrbitTween = null
    }
    for (const star of this.stunStars) {
      star.destroy()
    }
    this.stunStars = []
  }

  /**
   * Clear all status effect visuals.
   */
  private clearAllStatusEffects(): void {
    for (const emitter of this.statusEffectEmitters.values()) {
      emitter.destroy()
    }
    this.statusEffectEmitters.clear()
    this.clearStunEffect()
  }

  /**
   * Update status effect emitter positions when unit moves.
   */
  private updateStatusEffectPositions(): void {
    for (const [effectType, emitter] of this.statusEffectEmitters) {
      switch (effectType) {
        case 'BURNING':
          emitter.setPosition(this.x, this.y - 8)
          break
        case 'POISONED':
          emitter.setPosition(this.x, this.y - 16)
          break
        case 'PURIFIED':
          emitter.setPosition(this.x, this.y - 8)
          break
        case 'IMMOBILIZED':
          emitter.setPosition(this.x, this.y + 6)
          break
      }
    }
    // Stun stars are updated by their tween
  }

  // Override destroy to cleanup
  destroy(fromScene?: boolean): void {
    this.stopBounce()
    this.stopBreathing()
    // Destroy all tracked animation tweens
    for (const tween of this.activeTweens) {
      tween.destroy()
    }
    this.activeTweens.clear()
    this.clearAllStatusEffects()
    this.sprite.destroy()
    this.healthBarBg.destroy()
    this.healthBarFill.destroy()
    super.destroy(fromScene)
  }
}
