import { cn } from '@/lib/utils'
import { EnemyType, getEnemy } from '@shared/constants/enemies'
import type { EnemyState } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import HealthBar from './HealthBar'

interface EnemyCardProps {
  enemy: EnemyState
  isTarget?: boolean
  className?: string
}

export default function EnemyCard({ enemy, isTarget, className }: EnemyCardProps) {
  const { t } = useTranslation()
  const template = getEnemy(enemy.enemyId)

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

  return (
    <div
      className={cn(
        'flex flex-col gap-2 rounded-lg border-2 p-3 transition-all',
        isTarget && !isDead && 'border-primary ring-primary/30 ring-2',
        isDead && 'opacity-40 grayscale',
        !isTarget && !isDead && 'border-border',
        className
      )}
    >
      <div className='flex items-center justify-between gap-2'>
        <span className={cn('text-sm font-medium', isDead && 'line-through')}>{t(template.name)}</span>
        <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium', getTypeBadgeColor())}>
          {template.type}
        </span>
      </div>

      <HealthBar current={enemy.currentHealth} max={enemy.maxHealth} />

      <div className='text-muted-foreground flex gap-2 text-[10px]'>
        <span>{t(`inventory.damage_type.${template.damageType}`)}</span>
        <span>•</span>
        <span>ATK: {template.type === EnemyType.BOSS ? 4 : template.type === EnemyType.ELITE ? 3 : 2}d</span>
      </div>
    </div>
  )
}
