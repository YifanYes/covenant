import Phaser from 'phaser'
import { DEPTH_LAYERS } from '../config'
import type { TacticalUnit, GridPosition } from '@shared/types/tactical-combat.types'

// Unit visual states
export type UnitVisualState = 'idle' | 'selected' | 'active' | 'targetable'

export class Unit extends Phaser.GameObjects.Container {
  // Child game objects
  private sprite: Phaser.GameObjects.Image
  private healthBarBg: Phaser.GameObjects.Rectangle
  private healthBarFill: Phaser.GameObjects.Rectangle
  private selectionIndicator: Phaser.GameObjects.Graphics
  private activeGlow: Phaser.GameObjects.Graphics

  // Unit data
  private unitData: TacticalUnit
  private visualState: UnitVisualState = 'idle'

  // Configuration
  private readonly SPRITE_SIZE = 32
  private readonly HEALTH_BAR_WIDTH = 28
  private readonly HEALTH_BAR_HEIGHT = 4
  private readonly HEALTH_BAR_OFFSET_Y = -20
  private readonly SELECTION_RADIUS = 18

  constructor(scene: Phaser.Scene, unitData: TacticalUnit, screenPos: { x: number; y: number }) {
    super(scene, screenPos.x, screenPos.y - 8) // Offset up to sit on tile

    this.unitData = unitData

    // Create selection indicator (drawn first, behind everything)
    this.selectionIndicator = scene.add.graphics()
    this.add(this.selectionIndicator)
    this.selectionIndicator.setVisible(false)

    // Create active glow (pulsing effect for active unit)
    this.activeGlow = scene.add.graphics()
    this.add(this.activeGlow)
    this.activeGlow.setVisible(false)

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

    // Draw selection and glow graphics
    this.drawSelectionIndicator()
    this.drawActiveGlow()

    // Make interactive
    this.setSize(this.SPRITE_SIZE, this.SPRITE_SIZE)
    this.setInteractive()

    // Store unit ID for click detection
    this.setData('unitId', unitData.id)
    this.setData('isPlayer', unitData.isPlayer)

    // Add to scene
    scene.add.existing(this)
  }

  private drawSelectionIndicator(): void {
    this.selectionIndicator.clear()

    // Draw a dashed circle for selection
    this.selectionIndicator.lineStyle(2, 0xfbbf24, 1) // Yellow/amber

    // Draw circle using arcs
    const segments = 16
    const radius = this.SELECTION_RADIUS
    for (let i = 0; i < segments; i += 2) {
      const startAngle = (i / segments) * Math.PI * 2
      const endAngle = ((i + 1) / segments) * Math.PI * 2

      this.selectionIndicator.beginPath()
      this.selectionIndicator.arc(0, 0, radius, startAngle, endAngle, false)
      this.selectionIndicator.strokePath()
    }
  }

  private drawActiveGlow(): void {
    this.activeGlow.clear()

    // Draw a solid circle glow for active unit
    this.activeGlow.lineStyle(3, 0xfbbf24, 0.8) // Yellow/amber with slight transparency
    this.activeGlow.strokeCircle(0, 0, this.SELECTION_RADIUS + 2)

    // Inner glow
    this.activeGlow.lineStyle(2, 0xfef3c7, 0.5) // Light yellow
    this.activeGlow.strokeCircle(0, 0, this.SELECTION_RADIUS - 2)
  }

  private updateHealthBar(): void {
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
    this.selectionIndicator.setVisible(false)
    this.activeGlow.setVisible(false)
    this.sprite.clearTint()

    switch (state) {
      case 'selected':
        this.selectionIndicator.setVisible(true)
        break
      case 'active':
        this.activeGlow.setVisible(true)
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

  // Override destroy to cleanup
  destroy(fromScene?: boolean): void {
    this.selectionIndicator.destroy()
    this.activeGlow.destroy()
    this.sprite.destroy()
    this.healthBarBg.destroy()
    this.healthBarFill.destroy()
    super.destroy(fromScene)
  }
}
