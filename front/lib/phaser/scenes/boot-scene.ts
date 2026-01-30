import Phaser from 'phaser'

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' })
  }

  preload(): void {
    // Create a simple loading bar
    const width = this.cameras.main.width
    const height = this.cameras.main.height

    const progressBar = this.add.graphics()
    const progressBox = this.add.graphics()
    progressBox.fillStyle(0x222222, 0.8)
    progressBox.fillRect(width / 2 - 160, height / 2 - 25, 320, 50)

    const loadingText = this.add.text(width / 2, height / 2 - 50, 'Loading...', {
      font: '20px monospace',
      color: '#ffffff'
    })
    loadingText.setOrigin(0.5, 0.5)

    // Progress events
    this.load.on('progress', (value: number) => {
      progressBar.clear()
      progressBar.fillStyle(0x4ade80, 1)
      progressBar.fillRect(width / 2 - 150, height / 2 - 15, 300 * value, 30)
    })

    this.load.on('complete', () => {
      progressBar.destroy()
      progressBox.destroy()
      loadingText.destroy()
    })

    // Placeholder assets - will be replaced with actual sprites later
    // For Phase 1, we generate placeholder graphics in create()
  }

  create(): void {
    // Generate placeholder textures for Phase 1
    this.generatePlaceholderTextures()

    // Transition to combat scene
    this.scene.start('CombatScene')
  }

  private generatePlaceholderTextures(): void {
    // Generate isometric tile placeholder
    const tileGraphics = this.make.graphics({ x: 0, y: 0 })

    // Grass tile (green diamond)
    tileGraphics.fillStyle(0x4a7c59)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0) // Top
    tileGraphics.lineTo(64, 16) // Right
    tileGraphics.lineTo(32, 32) // Bottom
    tileGraphics.lineTo(0, 16) // Left
    tileGraphics.closePath()
    tileGraphics.fillPath()
    // Add border
    tileGraphics.lineStyle(1, 0x2d4a35)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('tile_grass', 64, 32)

    // Stone tile (gray diamond)
    tileGraphics.clear()
    tileGraphics.fillStyle(0x708090)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0)
    tileGraphics.lineTo(64, 16)
    tileGraphics.lineTo(32, 32)
    tileGraphics.lineTo(0, 16)
    tileGraphics.closePath()
    tileGraphics.fillPath()
    tileGraphics.lineStyle(1, 0x4a5568)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('tile_stone', 64, 32)

    // Water tile (blue diamond)
    tileGraphics.clear()
    tileGraphics.fillStyle(0x4169e1)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0)
    tileGraphics.lineTo(64, 16)
    tileGraphics.lineTo(32, 32)
    tileGraphics.lineTo(0, 16)
    tileGraphics.closePath()
    tileGraphics.fillPath()
    tileGraphics.lineStyle(1, 0x2d4a8a)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('tile_water', 64, 32)

    // Lava tile (orange/red diamond)
    tileGraphics.clear()
    tileGraphics.fillStyle(0xff4500)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0)
    tileGraphics.lineTo(64, 16)
    tileGraphics.lineTo(32, 32)
    tileGraphics.lineTo(0, 16)
    tileGraphics.closePath()
    tileGraphics.fillPath()
    tileGraphics.lineStyle(1, 0xcc3700)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('tile_lava', 64, 32)

    // Obstacle tile (dark gray diamond)
    tileGraphics.clear()
    tileGraphics.fillStyle(0x2f2f2f)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0)
    tileGraphics.lineTo(64, 16)
    tileGraphics.lineTo(32, 32)
    tileGraphics.lineTo(0, 16)
    tileGraphics.closePath()
    tileGraphics.fillPath()
    tileGraphics.lineStyle(1, 0x1a1a1a)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('tile_obstacle', 64, 32)

    // Highlight tiles (semi-transparent)
    // Movement highlight (blue)
    tileGraphics.clear()
    tileGraphics.fillStyle(0x3b82f6, 0.4)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0)
    tileGraphics.lineTo(64, 16)
    tileGraphics.lineTo(32, 32)
    tileGraphics.lineTo(0, 16)
    tileGraphics.closePath()
    tileGraphics.fillPath()
    tileGraphics.lineStyle(2, 0x3b82f6, 0.8)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('highlight_movement', 64, 32)

    // Attack highlight (red)
    tileGraphics.clear()
    tileGraphics.fillStyle(0xef4444, 0.4)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0)
    tileGraphics.lineTo(64, 16)
    tileGraphics.lineTo(32, 32)
    tileGraphics.lineTo(0, 16)
    tileGraphics.closePath()
    tileGraphics.fillPath()
    tileGraphics.lineStyle(2, 0xef4444, 0.8)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('highlight_attack', 64, 32)

    // Doctrine highlight (purple)
    tileGraphics.clear()
    tileGraphics.fillStyle(0xa855f7, 0.4)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0)
    tileGraphics.lineTo(64, 16)
    tileGraphics.lineTo(32, 32)
    tileGraphics.lineTo(0, 16)
    tileGraphics.closePath()
    tileGraphics.fillPath()
    tileGraphics.lineStyle(2, 0xa855f7, 0.8)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('highlight_doctrine', 64, 32)

    // Selected highlight (yellow)
    tileGraphics.clear()
    tileGraphics.fillStyle(0xfbbf24, 0.4)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0)
    tileGraphics.lineTo(64, 16)
    tileGraphics.lineTo(32, 32)
    tileGraphics.lineTo(0, 16)
    tileGraphics.closePath()
    tileGraphics.fillPath()
    tileGraphics.lineStyle(2, 0xfbbf24, 0.8)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('highlight_selected', 64, 32)

    // Hover highlight (white)
    tileGraphics.clear()
    tileGraphics.fillStyle(0xffffff, 0.2)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0)
    tileGraphics.lineTo(64, 16)
    tileGraphics.lineTo(32, 32)
    tileGraphics.lineTo(0, 16)
    tileGraphics.closePath()
    tileGraphics.fillPath()
    tileGraphics.lineStyle(1, 0xffffff, 0.6)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('highlight_hover', 64, 32)

    // Path highlight (green)
    tileGraphics.clear()
    tileGraphics.fillStyle(0x22c55e, 0.4)
    tileGraphics.beginPath()
    tileGraphics.moveTo(32, 0)
    tileGraphics.lineTo(64, 16)
    tileGraphics.lineTo(32, 32)
    tileGraphics.lineTo(0, 16)
    tileGraphics.closePath()
    tileGraphics.fillPath()
    tileGraphics.lineStyle(2, 0x22c55e, 0.8)
    tileGraphics.strokePath()
    tileGraphics.generateTexture('highlight_path', 64, 32)

    // Player unit placeholder (blue circle)
    const unitGraphics = this.make.graphics({ x: 0, y: 0 })
    unitGraphics.fillStyle(0x3b82f6)
    unitGraphics.fillCircle(16, 16, 14)
    unitGraphics.lineStyle(2, 0x1d4ed8)
    unitGraphics.strokeCircle(16, 16, 14)
    unitGraphics.generateTexture('unit_player', 32, 32)

    // Enemy unit placeholder (red circle)
    unitGraphics.clear()
    unitGraphics.fillStyle(0xef4444)
    unitGraphics.fillCircle(16, 16, 14)
    unitGraphics.lineStyle(2, 0xb91c1c)
    unitGraphics.strokeCircle(16, 16, 14)
    unitGraphics.generateTexture('unit_enemy', 32, 32)

    // Hit spark particle (small bright circle for impact effects)
    const particleGraphics = this.make.graphics({ x: 0, y: 0 })
    particleGraphics.fillStyle(0xffffff)
    particleGraphics.fillCircle(4, 4, 4)
    particleGraphics.generateTexture('particle_spark', 8, 8)

    // Status effect particles
    // Burning - orange/red flame particle
    particleGraphics.clear()
    particleGraphics.fillStyle(0xff6b35)
    particleGraphics.fillCircle(3, 3, 3)
    particleGraphics.generateTexture('particle_flame', 6, 6)

    // Poisoned - green droplet particle
    particleGraphics.clear()
    particleGraphics.fillStyle(0x22c55e)
    particleGraphics.fillCircle(2, 3, 2)
    particleGraphics.fillTriangle(2, 0, 0, 3, 4, 3) // Droplet top
    particleGraphics.generateTexture('particle_poison', 5, 6)

    // Purified - golden holy sparkle
    particleGraphics.clear()
    particleGraphics.fillStyle(0xffd700)
    particleGraphics.fillCircle(3, 3, 2)
    // Small cross/star shape
    particleGraphics.fillRect(2, 0, 2, 6)
    particleGraphics.fillRect(0, 2, 6, 2)
    particleGraphics.generateTexture('particle_holy', 6, 6)

    // Stunned - yellow star particle
    particleGraphics.clear()
    particleGraphics.fillStyle(0xfbbf24)
    // Simple 4-point star
    particleGraphics.fillTriangle(4, 0, 3, 4, 5, 4) // Top
    particleGraphics.fillTriangle(8, 4, 4, 3, 4, 5) // Right
    particleGraphics.fillTriangle(4, 8, 5, 4, 3, 4) // Bottom
    particleGraphics.fillTriangle(0, 4, 4, 5, 4, 3) // Left
    particleGraphics.generateTexture('particle_stun', 8, 8)

    // Immobilized - ice crystal particle (light blue)
    particleGraphics.clear()
    particleGraphics.fillStyle(0x7dd3fc)
    // Diamond shape for ice crystal
    particleGraphics.fillTriangle(3, 0, 0, 3, 3, 6)
    particleGraphics.fillTriangle(3, 0, 6, 3, 3, 6)
    particleGraphics.generateTexture('particle_ice', 6, 6)

    // Spell effect particles

    // Fire ember - larger glowing ember
    particleGraphics.clear()
    particleGraphics.fillStyle(0xff6b35)
    particleGraphics.fillCircle(4, 4, 3)
    particleGraphics.fillStyle(0xffaa44, 0.7)
    particleGraphics.fillCircle(4, 4, 4)
    particleGraphics.generateTexture('particle_ember', 8, 8)

    // Lightning spark - bright jagged shape
    particleGraphics.clear()
    particleGraphics.fillStyle(0xffff88)
    particleGraphics.fillCircle(3, 3, 2)
    particleGraphics.fillStyle(0xffffff)
    particleGraphics.fillCircle(3, 3, 1)
    particleGraphics.generateTexture('particle_lightning', 6, 6)

    // Dark tendril - purple wisp
    particleGraphics.clear()
    particleGraphics.fillStyle(0x7b1fa2)
    particleGraphics.fillCircle(3, 4, 2)
    particleGraphics.fillStyle(0x4a148c, 0.7)
    particleGraphics.fillCircle(3, 3, 3)
    particleGraphics.generateTexture('particle_dark', 6, 8)

    // Holy ray - golden streak
    particleGraphics.clear()
    particleGraphics.fillStyle(0xffd700)
    particleGraphics.fillRect(0, 2, 8, 2)
    particleGraphics.fillStyle(0xfffacd)
    particleGraphics.fillRect(1, 2, 6, 2)
    particleGraphics.generateTexture('particle_ray', 8, 6)

    // Ice shard - angular crystal
    particleGraphics.clear()
    particleGraphics.fillStyle(0xbae6fd)
    particleGraphics.fillTriangle(3, 0, 0, 6, 6, 6)
    particleGraphics.fillStyle(0xe0f2fe, 0.8)
    particleGraphics.fillTriangle(3, 1, 1, 5, 5, 5)
    particleGraphics.generateTexture('particle_shard', 6, 6)

    particleGraphics.destroy()

    // Cleanup
    tileGraphics.destroy()
    unitGraphics.destroy()
  }
}
