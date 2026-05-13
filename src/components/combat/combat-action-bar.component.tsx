'use client'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'
import Button from '@/ui/button.component'
import { BASIC_STRIKE_ID, ABILITIES } from '@shared/constants/abilities'
import { getConsumableById } from '@shared/constants/items'
import { ItemType, type InventoryCharacter, type InventoryItem } from '@shared/types/gamification.types'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type ActionView = 'menu' | 'moves' | 'item'

interface CombatActionBarProps {
  character: InventoryCharacter
  currentMana: number
  onSelectMove: (moveId: string) => void
  onUsePotion: (consumableId: string) => void
  onCancelMove: () => void
  selectedMoveId: string | null
  targetingMode: 'single' | 'all' | null
  potionUsedThisTurn: boolean
  isLoading: boolean
  disabled: boolean
  className?: string
}

export default function CombatActionBar({
  character,
  currentMana,
  onSelectMove,
  onUsePotion,
  onCancelMove,
  selectedMoveId,
  targetingMode,
  potionUsedThisTurn,
  isLoading,
  disabled,
  className
}: CombatActionBarProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<ActionView>('menu')

  const currentClass = character.classes.find((c) => c.className === character.currentClass)!
  const equippedMoves = (currentClass.equippedAbilities ?? []).map((id) => ABILITIES[id]).filter(Boolean)

  const groupedConsumables = (character.inventory ?? [])
    .filter((item: InventoryItem) => item.type === ItemType.CONSUMABLE)
    .reduce<Record<string, { item: InventoryItem; count: number }>>((acc, item) => {
      if (!item.definitionId) return acc
      if (acc[item.definitionId]) {
        acc[item.definitionId].count++
      } else {
        acc[item.definitionId] = { item, count: 1 }
      }
      return acc
    }, {})

  useEffect(() => {
    if (disabled) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prop-driven reset to menu when turn ends
      setView('menu')
    }
  }, [disabled])

  useEffect(() => {
    if (selectedMoveId === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- prop-driven reset after cancel
      setView('menu')
    }
  }, [selectedMoveId])

  if (targetingMode) {
    return (
      <div className={cn(panelChrome, 'flex overflow-hidden', className)}>
        <button
          className="flex h-full w-full items-center justify-center text-sm font-medium transition-colors hover:bg-primary/10 active:bg-primary active:text-primary-foreground"
          onClick={onCancelMove}
        >
          {t('combat.targeting.cancel')}
        </button>
      </div>
    )
  }

  return (
    <div className={cn(panelChrome, 'flex flex-col overflow-hidden', className)}>
      {view === 'menu' && (
        <div className="flex h-full divide-x-2 divide-primary/60">
          <button
            className={cn(
              'flex flex-1 items-center justify-center text-sm font-medium transition-colors',
              'hover:bg-primary/10 active:bg-primary active:text-primary-foreground',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => onSelectMove(BASIC_STRIKE_ID)}
            disabled={disabled}
          >
            {t('combat.action.attack')}
          </button>
          <button
            className={cn(
              'flex flex-1 items-center justify-center text-sm font-medium transition-colors',
              'hover:bg-primary/10 active:bg-primary active:text-primary-foreground',
              disabled && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => setView('moves')}
            disabled={disabled}
          >
            {t('combat.action.ability')}
          </button>
          <button
            className={cn(
              'flex flex-1 items-center justify-center text-sm font-medium transition-colors',
              'hover:bg-primary/10 active:bg-primary active:text-primary-foreground',
              (disabled || potionUsedThisTurn) && 'cursor-not-allowed opacity-50'
            )}
            onClick={() => setView('item')}
            disabled={disabled || potionUsedThisTurn}
          >
            {t('combat.action.item')}
          </button>
        </div>
      )}

      {view === 'moves' && (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {equippedMoves.length === 0 ? (
            <p className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
              {t('abilities.empty_equipped')}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {equippedMoves.map((move) => {
                const canUse = currentMana >= move.manaCost
                return (
                  <Button
                    key={move.id}
                    variant="outline"
                    size="sm"
                    onClick={() => onSelectMove(move.id)}
                    disabled={!canUse || isLoading || disabled}
                    className={cn('justify-between', !canUse && 'opacity-50')}
                  >
                    <span>{t(move.nameKey)}</span>
                    <span className="text-xs text-blue-400">{move.manaCost} MP</span>
                  </Button>
                )
              })}
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => setView('menu')} className="mt-auto w-full">
            {t('common.back')}
          </Button>
        </div>
      )}

      {view === 'item' && (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {Object.keys(groupedConsumables).length === 0 ? (
            <p className="text-muted-foreground flex flex-1 items-center justify-center text-sm">
              {t('combat.no_items')}
            </p>
          ) : (
            Object.entries(groupedConsumables).map(([defId, { count }]) => {
              const consumable = getConsumableById(defId)
              if (!consumable) return null
              return (
                <Button
                  key={defId}
                  variant="outline"
                  size="sm"
                  onClick={() => onUsePotion(defId)}
                  disabled={isLoading || disabled || potionUsedThisTurn}
                  className="justify-start"
                >
                  <span>{t(consumable.nameKey)}</span>
                  <span className="text-muted-foreground ml-1 text-xs">x{count}</span>
                  {consumable.effect.healHealth && (
                    <span className="ml-auto text-xs text-emerald-400">+{consumable.effect.healHealth} HP</span>
                  )}
                </Button>
              )
            })
          )}
          <Button variant="ghost" size="sm" onClick={() => setView('menu')} className="mt-auto w-full">
            {t('common.back')}
          </Button>
        </div>
      )}
    </div>
  )
}
