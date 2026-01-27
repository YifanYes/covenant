'use client'
import { cn } from '@/lib/cn.lib'
import { EnemyType, getEnemy } from '@shared/constants/enemies'
import type { EnemyState } from '@shared/types/gamification.types'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import HealthBar from './health-bar.component'

interface EnemyCardProps {
  enemy: EnemyState
  isTarget?: boolean
  className?: string
}

export default function EnemyCard({ enemy, isTarget, className }: EnemyCardProps) {
  const { t } = useTranslation()
  const template = getEnemy(enemy.templateId)

  if (!template) return null

  const isDead = enemy.currentHealth <= 0

  const getTypeBadgeColor = () => {
    switch (template.type) {
      case EnemyType.BOSS:
        return 'bg-red-600 text-white'
      case EnemyType.ELITE:
        return 'bg-purple-600 text-white'
      default:
        return 'bg-slate-600 text-white'
    }
  }

  const getEnemyName = () => {
    if (enemy.namePrefix && enemy.nameSuffix) {
      const prefix = t(enemy.namePrefix)
      const suffix = t(enemy.nameSuffix)
      return `${prefix} ${suffix}`
    }
    return t(template.name)
  }

  return (
    <div
      className={cn(
        'border-border flex gap-3 overflow-hidden rounded-lg border p-3 transition-all',
        isTarget && !isDead && 'ring-1 ring-emerald-500/30',
        isDead && 'opacity-40 grayscale',
        className
      )}
    >
      {/* Enemy Portrait */}
      <div className='shrink-0'>
        <Image
          src={`/assets/enemies/${template.imageId}.png`}
          alt={t(template.name)}
          width={64}
          height={64}
          className='h-16 w-16 rounded-lg object-cover'
          onError={(e) => {
            // Hide the image if it fails to load
            e.currentTarget.style.display = 'none'
          }}
        />
      </div>

      {/* Enemy Info */}
      <div className='flex min-w-0 flex-1 flex-col gap-2'>
        <div className='flex items-center justify-between gap-2'>
          <span className={cn('truncate text-sm font-medium', isDead && 'line-through')}>{getEnemyName()}</span>
          <span className={cn('shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium', getTypeBadgeColor())}>
            {template.type}
          </span>
        </div>

        <HealthBar current={enemy.currentHealth} max={enemy.maxHealth} />

        <div className='text-muted-foreground flex gap-2 truncate text-[10px]'>
          <span className='truncate'>{t(`inventory.damage_type.${template.damageType}`)}</span>
          <span>•</span>
          <span className='shrink-0'>ATK: {template.attackDice}d</span>
          <span>•</span>
          <span className='shrink-0'>DEF: {template.defenseDice}d</span>
        </div>
      </div>
    </div>
  )
}
