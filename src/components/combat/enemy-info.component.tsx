'use client'
import HealthBar from '@/components/combat/health-bar.component'
import ManaBar from '@/components/combat/mana-bar.component'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import { EnemyType, getEnemy } from '@shared/constants/enemies'
import type { EnemyState } from '@shared/types/gamification.types'
import { Battery, Heart } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'

interface EnemyInfoProps {
  enemy: EnemyState
  className?: string
}

export default function EnemyInfo({ enemy, className }: EnemyInfoProps) {
  const { t } = useTranslation()
  const template = getEnemy(enemy.templateId)
  const isDead = enemy.currentHealth <= 0

  const name =
    enemy.namePrefix && enemy.nameSuffix
      ? `${t(enemy.namePrefix)} ${t(enemy.nameSuffix)}`
      : template
        ? t(template.name)
        : t('combat.unknown_enemy')

  const badgeColor =
    template?.type === EnemyType.BOSS
      ? 'bg-red-600'
      : template?.type === EnemyType.ELITE
        ? 'bg-purple-600'
        : 'bg-slate-600'

  return (
    <div className={cn(panelChrome, 'flex flex-col gap-1.5 p-3', isDead && 'opacity-40 grayscale', className)}>
      <div className="flex items-center gap-2">
        <span className={cn('text-sm font-bold', isDead && 'line-through')}>{name}</span>
        {template && (
          <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium uppercase text-white', badgeColor)}>
            {template.type}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Heart className="h-3 w-3 shrink-0 text-red-500" />
        <span className="text-[10px] font-bold tracking-widest text-primary">HP</span>
        <HealthBar current={enemy.currentHealth} max={enemy.maxHealth} className="flex-1" />
      </div>
      {enemy.maxMana > 0 && (
        <div className="flex items-center gap-1.5">
          <Battery className="h-3 w-3 shrink-0 text-blue-400" />
          <span className="text-[10px] font-bold tracking-widest text-primary">MP</span>
          <ManaBar current={enemy.currentMana} max={enemy.maxMana} className="flex-1" />
        </div>
      )}
    </div>
  )
}
