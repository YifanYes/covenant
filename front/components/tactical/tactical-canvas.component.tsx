'use client'

import { useEffect, useRef, useCallback } from 'react'
import type Phaser from 'phaser'

interface TacticalCanvasProps {
  onReady?: (game: Phaser.Game) => void
  className?: string
}

export default function TacticalCanvas({
  onReady,
  className
}: TacticalCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  const initGame = useCallback(async () => {
    if (!containerRef.current || gameRef.current) return

    const { createGame } = await import('@/lib/phaser/game-instance')
    const game = await createGame(containerRef.current)
    gameRef.current = game

    if (onReady) {
      onReady(game)
    }
  }, [onReady])

  useEffect(() => {
    let mounted = true

    if (mounted) {
      initGame()
    }

    return () => {
      mounted = false
      if (gameRef.current) {
        import('@/lib/phaser/game-instance').then(({ destroyGame }) => {
          destroyGame()
          gameRef.current = null
        })
      }
    }
  }, [initGame])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        // Ensure the canvas container takes full size
        width: '100%',
        height: '100%',
        minHeight: '400px'
      }}
    />
  )
}
