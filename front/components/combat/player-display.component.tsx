'use client'
import { cn } from '@/lib/cn.lib'
import HealthBar from '@/app/(workspace)/map/_components/health-bar.component'
import { DamageNumberContainer } from '@/components/combat/damage-number.component'
import CombatUnitSprite from '@/components/combat/combat-unit-sprite.component'
import TierBadge from '@/common/tier-badge.component'
import type { CombatAnimationState } from '@/hooks/use-combat-animations.hook'
import { Battery, Heart } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'

interface PlayerDisplayProps {
  name: string
  currentClass: string
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  tier: number
  magicNature: string | null
  animation: CombatAnimationState
  damageNumbers: { amount: number; type: 'damage' | 'heal' | 'critical'; targetId: string }[]
  className?: string
}

export default function PlayerDisplay({
  name,
  currentClass,
  health,
  maxHealth,
  mana,
  maxMana,
  tier,
  magicNature,
  animation,
  damageNumbers,
  className
}: PlayerDisplayProps) {
  const { t } = useTranslation()

  const manaPercentage = Math.max(0, Math.min(100, (mana / maxMana) * 100))

  return (
    <div className={cn('flex items-end gap-4', className)}>
      {/* Left: Player sprite */}
      <div className="relative h-28 w-28 shrink-0 p-2">
        <CombatUnitSprite
          imageUrl={`/assets/classes/${currentClass}.png`}
          alt={name}
          animation={animation}
          isPlayer
          className="h-full w-full"
        />
        <DamageNumberContainer numbers={damageNumbers} targetId="player" />
      </div>

      {/* Right: Info panel */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold">{name}</span>
          {magicNature && (
            <span className="text-muted-foreground text-xs">{t(`doctrines.magic_nature.${magicNature}`)}</span>
          )}
          <TierBadge tier={tier} />
        </div>

        {/* HP */}
        <div className="flex items-center gap-2">
          <Heart className="text-red-500 h-4 w-4 shrink-0" />
          <HealthBar current={health} max={maxHealth} className="flex-1" />
        </div>

        {/* MP */}
        <div className="flex items-center gap-2">
          <Battery className="text-blue-500 h-4 w-4 shrink-0" />
          <div className="flex flex-1 items-center gap-2">
            <div className="bg-muted relative h-2.5 flex-1 overflow-hidden rounded-full">
              <div
                className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300"
                style={{ width: `${manaPercentage}%` }}
              />
            </div>
            <span className="text-muted-foreground min-w-12 text-right text-xs font-medium">
              {mana}/{maxMana}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
