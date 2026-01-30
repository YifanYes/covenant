import type Phaser from 'phaser'
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config'

let gameInstance: Phaser.Game | null = null

export async function createGame(parent: HTMLElement): Promise<Phaser.Game> {
  if (typeof window === 'undefined') {
    throw new Error('Phaser can only run in browser')
  }

  // Dynamic import to avoid SSR issues
  const Phaser = await import('phaser')
  const { BootScene } = await import('./scenes/boot-scene')
  const { CombatScene } = await import('./scenes/combat-scene')

  if (gameInstance) {
    gameInstance.destroy(true)
  }

  gameInstance = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    pixelArt: true,
    backgroundColor: '#1a1a2e',
    scene: [BootScene, CombatScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_HORIZONTALLY
    },
    render: {
      antialias: false,
      pixelArt: true
    },
    fps: {
      target: 60,
      min: 10, // Prevent complete throttling by browser
      forceSetTimeOut: false // Use rAF but wake() ensures responsiveness
    }
  })

  return gameInstance
}

export function destroyGame(): void {
  if (gameInstance) {
    gameInstance.destroy(true)
    gameInstance = null
  }
}

export function getGame(): Phaser.Game | null {
  return gameInstance
}
