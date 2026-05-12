'use client'
import type { CombatAnimationState } from '@/hooks/use-combat-animations.hook'
import { cn } from '@/lib/cn.lib'
import { motion } from 'framer-motion'
import Image from 'next/image'

interface CombatUnitSpriteProps {
  imageUrl: string
  alt: string
  animation: CombatAnimationState
  isPlayer?: boolean
  isDead?: boolean
  className?: string
}

const variants = {
  idle: {
    x: 0,
    y: 0,
    opacity: 1,
    scale: 1,
    filter: 'brightness(1)'
  },
  'player-attack': {
    x: [0, 30, 0],
    transition: { duration: 0.4, ease: 'easeInOut' as const }
  },
  'enemy-attack': {
    x: [0, -30, 0],
    transition: { duration: 0.4, ease: 'easeInOut' as const }
  },
  hurt: {
    x: [0, -5, 5, -5, 5, 0],
    transition: { duration: 0.4 }
  },
  death: {
    opacity: 0,
    y: 20,
    scale: 0.8,
    transition: { duration: 0.6 }
  },
  'ability-cast': {
    filter: ['brightness(1)', 'brightness(1.5)', 'brightness(1)'],
    scale: [1, 1.05, 1],
    transition: { duration: 0.5 }
  },
  heal: {
    filter: ['brightness(1)', 'brightness(1.3)', 'brightness(1)'],
    y: [0, -3, 0],
    transition: { duration: 0.4 }
  }
}

export default function CombatUnitSprite({
  imageUrl,
  alt,
  animation,
  isPlayer,
  isDead,
  className
}: CombatUnitSpriteProps) {
  const activeVariant = isDead
    ? 'death'
    : isPlayer && animation === 'player-attack'
      ? 'player-attack'
      : !isPlayer && animation === 'enemy-attack'
        ? 'enemy-attack'
        : isPlayer && animation === 'enemy-attack'
          ? 'hurt'
          : !isPlayer && animation === 'player-attack'
            ? 'hurt'
            : animation === 'ability-cast'
              ? 'ability-cast'
              : animation === 'heal' && isPlayer
                ? 'heal'
                : 'idle'

  return (
    <motion.div
      className={cn('relative', isDead && 'grayscale', className)}
      animate={activeVariant}
      variants={variants}
    >
      <Image
        src={imageUrl}
        alt={alt}
        fill
        sizes="112px"
        className="object-contain"
        style={{ imageRendering: 'pixelated' }}
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    </motion.div>
  )
}
