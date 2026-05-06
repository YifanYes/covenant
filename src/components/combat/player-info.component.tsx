'use client'
import HealthBar from '@/app/(workspace)/map/_components/health-bar.component'
import TierBadge from '@/common/tier-badge.component'
import { panelChrome } from '@/components/combat/combat-styles'
import { cn } from '@/lib/cn.lib'
import { Battery, Heart } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'

interface PlayerInfoProps {
  name: string
  tier: number
  magicNature: string | null
  health: number
  maxHealth: number
  mana: number
  maxMana: number
  className?: string
}

export default function PlayerInfo({
  name,
  tier,
  magicNature,
  health,
  maxHealth,
  mana,
  maxMana,
  className
}: PlayerInfoProps) {
  const { t } = useTranslation()
  const manaPercentage = Math.max(0, Math.min(100, (mana / maxMana) * 100))

  return (
    <div className={cn(panelChrome, 'flex flex-col gap-1.5 p-3', className)}>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold">{name}</span>
        {magicNature && (
          <span className="text-muted-foreground text-xs">{t(`doctrines.magic_nature.${magicNature}`)}</span>
        )}
        <TierBadge tier={tier} />
      </div>
      <div className="flex items-center gap-1.5">
        <Heart className="h-3 w-3 shrink-0 text-red-500" />
        <span className="text-[10px] font-bold tracking-widest text-primary">HP</span>
        <HealthBar current={health} max={maxHealth} className="flex-1" />
      </div>
      <div className="flex items-center gap-1.5">
        <Battery className="h-3 w-3 shrink-0 text-blue-400" />
        <span className="text-[10px] font-bold tracking-widest text-primary">MP</span>
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
  )
}
