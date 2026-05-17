'use client'
import CombatUnitSprite from '@/components/combat/combat-unit-sprite.component'
import { DamageNumberContainer } from '@/components/combat/damage-number.component'
import SpritePlatform from '@/components/combat/sprite-platform.component'
import type { CombatAnimationState } from '@/hooks/use-combat-animations.hook'
import { cn } from '@/lib/cn.lib'
import { getEnemy } from '@/shared/constants/enemies.constants'
import type { EnemyState } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'

interface EnemySpriteProps {
  enemy: EnemyState
  animation: CombatAnimationState
  damageNumbers: { amount: number; type: 'damage' | 'heal' | 'critical'; targetId: string }[]
  targetingMode: 'single' | 'all' | null
  onSelectTarget?: (targetIdOrAll: string) => void
  className?: string
}

export default function EnemySprite({
  enemy,
  animation,
  damageNumbers,
  targetingMode,
  onSelectTarget,
  className
}: EnemySpriteProps) {
  const { t } = useTranslation()
  const template = getEnemy(enemy.templateId)
  const isDead = enemy.currentHealth <= 0
  const isTargetable = targetingMode !== null && !isDead

  const name =
    enemy.namePrefix && enemy.nameSuffix
      ? `${t(enemy.namePrefix)} ${t(enemy.nameSuffix)}`
      : template
        ? t(template.name)
        : t('combat.unknown_enemy')

  return (
    <div
      className={cn(
        'relative h-28 w-28 shrink-0 p-2',
        isTargetable && 'cursor-pointer rounded-xl ring-2 ring-emerald-500/50 hover:ring-emerald-500',
        targetingMode === 'all' && !isDead && 'ring-amber-500/50 hover:ring-amber-500',
        className
      )}
      style={{ transform: 'scaleX(-1)' }}
      onClick={() => {
        if (!isTargetable || !onSelectTarget) return
        onSelectTarget(targetingMode === 'all' ? 'all' : enemy.id)
      }}
    >
      <CombatUnitSprite
        imageUrl={template ? `/assets/enemies/${template.imageId}.png` : '/assets/enemies/default.png'}
        alt={name}
        animation={animation}
        isDead={isDead}
        className="h-full w-full"
      />
      <DamageNumberContainer numbers={damageNumbers} targetId={enemy.id} />
      <SpritePlatform />
    </div>
  )
}
