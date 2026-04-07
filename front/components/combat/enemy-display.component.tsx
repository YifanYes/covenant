'use client'
import { cn } from '@/lib/cn.lib'
import HealthBar from '@/app/(workspace)/map/_components/health-bar.component'
import { DamageNumberContainer } from '@/components/combat/damage-number.component'
import CombatUnitSprite from '@/components/combat/combat-unit-sprite.component'
import type { CombatAnimationState } from '@/hooks/use-combat-animations.hook'
import { getEnemy, EnemyType } from '@shared/constants/enemies'
import type { EnemyState } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'

interface EnemyDisplayProps {
  enemies: EnemyState[]
  animation: CombatAnimationState
  damageNumbers: { amount: number; type: 'damage' | 'heal' | 'critical'; targetId: string }[]
  targetingMode: 'single' | 'all' | null
  onSelectTarget?: (enemyId: string) => void
  className?: string
}

export default function EnemyDisplay({
  enemies,
  animation,
  damageNumbers,
  targetingMode,
  onSelectTarget,
  className
}: EnemyDisplayProps) {
  const { t } = useTranslation()

  const getEnemyName = (enemy: EnemyState) => {
    if (enemy.namePrefix && enemy.nameSuffix) {
      return `${t(enemy.namePrefix)} ${t(enemy.nameSuffix)}`
    }
    const template = getEnemy(enemy.templateId)
    return template ? t(template.name) : t('combat.unknown_enemy')
  }

  const getTypeBadge = (enemy: EnemyState) => {
    const template = getEnemy(enemy.templateId)
    if (!template) return null

    const badgeColor =
      template.type === EnemyType.BOSS
        ? 'bg-red-600'
        : template.type === EnemyType.ELITE
          ? 'bg-purple-600'
          : 'bg-slate-600'

    return (
      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-medium uppercase text-white', badgeColor)}>
        {template.type}
      </span>
    )
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {enemies.map((enemy) => {
        const template = getEnemy(enemy.templateId)
        const isDead = enemy.currentHealth <= 0
        const isTargetable = targetingMode !== null && !isDead

        return (
          <div
            key={enemy.id}
            className={cn(
              'flex items-start gap-3 transition-all',
              isTargetable && 'cursor-pointer',
              isDead && 'opacity-40 grayscale'
            )}
            onClick={() => {
              if (isTargetable && onSelectTarget) {
                if (targetingMode === 'all') {
                  onSelectTarget('all')
                } else {
                  onSelectTarget(enemy.id)
                }
              }
            }}
          >
            {/* Left: Info panel */}
            <div className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className={cn('text-sm font-bold', isDead && 'line-through')}>{getEnemyName(enemy)}</span>
                {getTypeBadge(enemy)}
              </div>
              <HealthBar current={enemy.currentHealth} max={enemy.maxHealth} className="w-full" />
              {isTargetable && (
                <span className="text-emerald-400 text-xs">{t('combat.action.select_target')}</span>
              )}
            </div>

            {/* Right: Sprite */}
            <div
              className={cn(
                'relative h-28 w-28 shrink-0 p-2',
                isTargetable && 'hover:ring-2 hover:ring-emerald-500/50',
                targetingMode === 'all' && !isDead && 'ring-1 ring-amber-500/30'
              )}
            >
              <CombatUnitSprite
                imageUrl={template ? `/assets/enemies/${template.imageId}.png` : '/assets/enemies/default.png'}
                alt={getEnemyName(enemy)}
                animation={animation}
                isDead={isDead}
                className="h-full w-full"
              />
              <DamageNumberContainer numbers={damageNumbers} targetId={enemy.id} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
