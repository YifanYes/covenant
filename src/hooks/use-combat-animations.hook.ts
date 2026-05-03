'use client'
import { useCallback, useState } from 'react'

export type CombatAnimationState =
  | 'idle'
  | 'player-attack'
  | 'enemy-attack'
  | 'damage-number'
  | 'death'
  | 'doctrine-cast'
  | 'heal'

interface DamageNumberData {
  amount: number
  type: 'damage' | 'heal' | 'critical'
  targetId: string
}

export function useCombatAnimations() {
  const [animation, setAnimation] = useState<CombatAnimationState>('idle')
  const [damageNumbers, setDamageNumbers] = useState<DamageNumberData[]>([])

  const playAnimation = useCallback((type: CombatAnimationState, durationMs: number = 600): Promise<void> => {
    return new Promise((resolve) => {
      setAnimation(type)
      setTimeout(() => {
        setAnimation('idle')
        resolve()
      }, durationMs)
    })
  }, [])

  const playAttackAnimation = useCallback(() => playAnimation('player-attack', 600), [playAnimation])

  const playEnemyAttackAnimation = useCallback(() => playAnimation('enemy-attack', 600), [playAnimation])

  const playDeathAnimation = useCallback(() => playAnimation('death', 800), [playAnimation])

  const playDoctrineAnimation = useCallback(() => playAnimation('doctrine-cast', 700), [playAnimation])

  const playHealAnimation = useCallback(() => playAnimation('heal', 500), [playAnimation])

  const showDamageNumber = useCallback(
    (amount: number, type: 'damage' | 'heal' | 'critical', targetId: string): Promise<void> => {
      return new Promise((resolve) => {
        const entry: DamageNumberData = { amount, type, targetId }
        setDamageNumbers((prev) => [...prev, entry])
        setTimeout(() => {
          setDamageNumbers((prev) => prev.filter((d) => d !== entry))
          resolve()
        }, 1000)
      })
    },
    []
  )

  const isAnimating = animation !== 'idle'

  return {
    animation,
    damageNumbers,
    isAnimating,
    playAttackAnimation,
    playEnemyAttackAnimation,
    playDeathAnimation,
    playDoctrineAnimation,
    playHealAnimation,
    showDamageNumber
  }
}
