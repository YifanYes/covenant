'use client'
import CombatUnitSprite from '@/components/combat/combat-unit-sprite.component'
import { DamageNumberContainer } from '@/components/combat/damage-number.component'
import SpritePlatform from '@/components/combat/sprite-platform.component'
import type { CombatAnimationState } from '@/hooks/use-combat-animations.hook'

interface PlayerSpriteProps {
  currentClass: string
  name: string
  animation: CombatAnimationState
  damageNumbers: { amount: number; type: 'damage' | 'heal' | 'critical'; targetId: string }[]
  className?: string
}

export default function PlayerSprite({ currentClass, name, animation, damageNumbers, className }: PlayerSpriteProps) {
  return (
    <div className={`relative h-28 w-28 shrink-0 p-2 ${className ?? ''}`} style={{ transform: 'scaleX(-1)' }}>
      <CombatUnitSprite
        imageUrl={`/assets/classes/${currentClass}.png`}
        alt={name}
        animation={animation}
        isPlayer
        className="h-full w-full"
      />
      <DamageNumberContainer numbers={damageNumbers} targetId="player" />
      <SpritePlatform />
    </div>
  )
}
