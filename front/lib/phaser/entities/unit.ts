import Phaser from 'phaser'
import { DEPTH_LAYERS, ANIMATION_DURATION } from '../config'
import type { TacticalUnit, GridPosition } from '@shared/types/tactical-combat.types'

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
  private spriteBaseY: number = 0

  // Configuration
  private readonly SPRITE_SIZE = 32
  private readonly HEALTH_BAR_WIDTH = 28
  private readonly HEALTH_BAR_HEIGHT = 4
  private readonly HEALTH_BAR_OFFSET_Y = -20
  private readonly BOUNCE_AMOUNT = 4
  private readonly BOUNCE_DURATION = 600

  constructor(scene: Phaser.Scene, unitData: TacticalUnit, screenPos: { x: number; y: number }) {
    super(scene, screenPos.x, screenPos.y - 8) // Offset up to sit on tile

    this.unitData = unitData

    // Determine texture key
    const textureKey = unitData.isPlayer ? 'unit_player' : 'unit_enemy'

    // Create main sprite
    this.sprite = scene.add.image(0, 0, textureKey)
    this.sprite.setDisplaySize(this.SPRITE_SIZE, this.SPRITE_SIZE)
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
      this.bounceTween.stop()
      this.bounceTween = null
      // Reset sprite to base position
      this.sprite.setY(this.spriteBaseY)
    }
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
  }

  // Set visual state
  setVisualState(state: UnitVisualState): void {
    this.visualState = state

    // Reset all indicators
    this.stopBounce()
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
        break
      case 'idle':
      default:
        // No special indicators
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
  }

  // Set custom sprite texture
  setCustomSprite(textureKey: string): void {
    this.sprite.setTexture(textureKey)
    this.sprite.setDisplaySize(this.SPRITE_SIZE, this.SPRITE_SIZE)
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
        this.scene.tweens.add({
          targets: this,
          x: screenPos.x,
          y: screenPos.y - 8, // Apply vertical offset
          duration: ANIMATION_DURATION.UNIT_MOVE,
          ease: 'Sine.easeInOut',
          onUpdate: () => {
            // Update depth during tween for smooth transitions
            this.setDepth(newDepth)
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

  // Override destroy to cleanup
  destroy(fromScene?: boolean): void {
    this.stopBounce()
    this.sprite.destroy()
    this.healthBarBg.destroy()
    this.healthBarFill.destroy()
    super.destroy(fromScene)
  }
}
