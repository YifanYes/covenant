'use client'

import { useTranslation } from 'react-i18next'
import { Heart, SpeedFast, Zap } from '@nsmr/pixelart-react'

import { useTacticalCombatStore } from '@/stores/tactical-combat.store'
import { useTacticalMove } from '@/hooks/use-tactical-move.hook'
import { useTacticalAttack } from '@/hooks/use-tactical-attack.hook'
import type { TacticalUnit, TacticalPhase } from '@shared/types/tactical-combat.types'
import Button from '@/components/ui/button.component'
import { cn } from '@/lib/cn.lib'

interface ActionMenuProps {
  activeUnit: TacticalUnit
  phase: TacticalPhase
}

export default function ActionMenu({ activeUnit, phase }: ActionMenuProps) {
  const { t } = useTranslation()
  const { selectAction, cancelAction, pendingAction } =
    useTacticalCombatStore()
  const { confirmMove, isLoading: isMoveLoading } = useTacticalMove()
  const { getPendingAttackInfo, isLoading: isAttackLoading } = useTacticalAttack()

  const canMove = !activeUnit.hasMoved
  const canAttack = !activeUnit.hasActed

  // Render action selection
  if (phase === 'select_action') {
    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold mb-3">{activeUnit.name}</h3>

        <div className="space-y-1">
          <Button
            variant="outline"
            size="sm"
            className={cn('w-full justify-start', !canMove && 'opacity-50')}
            disabled={!canMove}
            onClick={() => selectAction({ type: 'move' })}
          >
            <MoveIcon className="w-4 h-4 mr-2" />
            {t('tactical.actions.move')}
            <span className="ml-auto text-xs text-muted-foreground">
              {activeUnit.movementRange} {t('tactical.tiles')}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className={cn('w-full justify-start', !canAttack && 'opacity-50')}
            disabled={!canAttack}
            onClick={() => selectAction({ type: 'attack' })}
          >
            <AttackIcon className="w-4 h-4 mr-2" />
            {t('tactical.actions.attack')}
            <span className="ml-auto text-xs text-muted-foreground">
              {activeUnit.attackRange} {t('tactical.range')}
            </span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start"
            onClick={() => selectAction({ type: 'wait' })}
          >
            <WaitIcon className="w-4 h-4 mr-2" />
            {t('tactical.actions.next_turn')}
          </Button>
        </div>

        {/* Unit stats */}
        <div className="mt-4 pt-4 border-t text-xs space-y-1 text-muted-foreground">
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              <Heart className="h-3 w-3 text-emerald-500" />
              {t('inventory.health')}
            </span>
            <span className="text-foreground">
              {activeUnit.currentHealth}/{activeUnit.maxHealth}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              <Zap className="h-3 w-3 text-blue-400" />
              {t('inventory.mana')}
            </span>
            <span className="text-foreground">
              {activeUnit.currentMana}/{activeUnit.maxMana}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="flex items-center gap-1">
              <SpeedFast className="h-3 w-3 text-amber-400" />
              {t('inventory.stats.speed')}
            </span>
            <span className="text-foreground">{activeUnit.speed}</span>
          </div>
        </div>
      </div>
    )
  }

  // Render move/target selection
  if (phase === 'select_move' || phase === 'select_target') {
    const attackInfo = getPendingAttackInfo()
    const isLoading = isMoveLoading || isAttackLoading

    return (
      <div className="space-y-2">
        <h3 className="text-sm font-semibold mb-3">
          {phase === 'select_move' ? t('tactical.select_destination') : t('tactical.select_target')}
        </h3>

        <p className="text-xs text-muted-foreground mb-4">
          {phase === 'select_move'
            ? t('tactical.click_to_move')
            : t('tactical.click_to_attack')}
        </p>

        {/* Show target info when attacking */}
        {phase === 'select_target' && attackInfo?.target && (
          <div className="bg-muted/50 rounded p-2 mb-2 text-xs">
            <div className="font-medium mb-1">{t('combat.target')}: {attackInfo.target.name}</div>
            <div className="flex justify-between text-muted-foreground">
              <span>{t('inventory.health')}</span>
              <span>{attackInfo.target.currentHealth}/{attackInfo.target.maxHealth}</span>
            </div>
          </div>
        )}

        {/* Show prompt to use dice roller for attacks */}
        {phase === 'select_target' && attackInfo?.target && (
          <div className="text-xs text-muted-foreground text-center py-2 border-t">
            {t('combat.use_dice_roller')}
          </div>
        )}

        {pendingAction && (
          <div className="space-y-2">
            {/* Only show Confirm button for movement, not attacks */}
            {phase === 'select_move' && (
              <Button
                variant="default"
                size="sm"
                className="w-full"
                disabled={isLoading || !pendingAction.path?.length}
                onClick={() => confirmMove()}
              >
                {isLoading ? t('tactical.moving') : t('confirm')}
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              disabled={isLoading}
              onClick={cancelAction}
            >
              {t('cancel')}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return null
}

// Simple icon components
function MoveIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M5 9l4-4 4 4" />
      <path d="M9 5v12" />
      <path d="M19 15l-4 4-4-4" />
      <path d="M15 19V7" />
    </svg>
  )
}

function AttackIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M14.5 12.5l-5-5" />
      <path d="M16 8l4-4" />
      <path d="M21 3l-1 1" />
      <path d="M4 21l5-5" />
      <path d="M8.5 15.5l-4 4" />
    </svg>
  )
}

function WaitIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}
