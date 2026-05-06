'use client'
import DiceResult from '@/app/(workspace)/map/_components/dice-result.component'
import DiceRoller from '@/app/(workspace)/map/_components/dice-roller.component'
import { panelChrome } from '@/components/combat/combat-styles'
import DoctrinePanel from '@/components/doctrine-panel.component'
import { cn } from '@/lib/cn.lib'
import Button from '@/ui/button.component'
import { getConsumableById } from '@shared/constants/items'
import type { DoctrineDefinition } from '@shared/types/doctrine.types'
import { ItemType, type InventoryCharacter, type InventoryItem } from '@shared/types/gamification.types'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

type ActionView = 'menu' | 'attack' | 'doctrine' | 'item'

interface CombatActionBarProps {
  character: InventoryCharacter
  diceBank: number
  attackRolls: number[] | null
  defenseRolls: number[] | null
  isRolling: boolean
  onRollDice: () => void
  onAttack: (targetId: string) => void
  onSelectDoctrine: (doctrineId: string) => void
  onUsePotion: (consumableId: string) => void
  onCancelDoctrine: () => void
  selectedDoctrineId: string | null
  targetingMode: 'single' | 'all' | null
  potionUsedThisTurn: boolean
  isLoading: boolean
  disabled: boolean
  enemies: { id: string; currentHealth: number }[]
  className?: string
}

export default function CombatActionBar({
  character,
  diceBank,
  attackRolls,
  defenseRolls,
  isRolling,
  onRollDice,
  onAttack,
  onSelectDoctrine,
  onUsePotion,
  onCancelDoctrine,
  selectedDoctrineId,
  targetingMode,
  potionUsedThisTurn,
  isLoading,
  disabled,
  enemies,
  className
}: CombatActionBarProps) {
  const { t } = useTranslation()
  const [view, setView] = useState<ActionView>('menu')

  const currentClass = character.classes.find((c) => c.className === character.currentClass)!

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

  // Reset to menu when turn ends or rolls/doctrine clear
  useEffect(() => {
    if (disabled) setView('menu')
  }, [disabled])

  useEffect(() => {
    if (attackRolls === null) setView('menu')
  }, [attackRolls])

  useEffect(() => {
    if (selectedDoctrineId === null) setView('menu')
  }, [selectedDoctrineId])

  const handleDoctrineUse = (doctrine: DoctrineDefinition) => {
    onSelectDoctrine(doctrine.id)
  }

  const handleConfirmAttack = () => {
    const living = enemies.filter((e) => e.currentHealth > 0)
    if (living.length === 1) onAttack(living[0].id)
  }

  // Targeting collapse: full-width cancel tile replaces 1×3 row
  if (targetingMode) {
    return (
      <div className={cn(panelChrome, 'flex overflow-hidden', className)}>
        <button
          className="flex h-full w-full items-center justify-center text-sm font-medium transition-colors hover:bg-primary/10 active:bg-primary active:text-primary-foreground"
          onClick={onCancelDoctrine}
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
            onClick={() => setView('attack')}
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
            onClick={() => setView('doctrine')}
            disabled={disabled}
          >
            {t('combat.action.doctrine')}
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

      {view === 'attack' && (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          {!attackRolls && (
            <DiceRoller
              diceBank={diceBank}
              attackDiceCount={currentClass.strengthAtk}
              defenseDiceCount={currentClass.strengthDef}
              onRoll={onRollDice}
              isRolling={isRolling}
              compact
            />
          )}

          {attackRolls && defenseRolls && (
            <div className="flex flex-col gap-2">
              <div>
                <span className="text-muted-foreground mb-1 block text-xs">{t('combat.attack_rolls')}</span>
                <div className="flex flex-wrap gap-1">
                  {attackRolls.map((value, i) => (
                    <DiceResult key={`atk-${i}`} value={value} isSuccess={value >= 4} isCritical={value === 6} />
                  ))}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground mb-1 block text-xs">{t('combat.defense_rolls')}</span>
                <div className="flex flex-wrap gap-1">
                  {defenseRolls.map((value, i) => (
                    <DiceResult key={`def-${i}`} value={value} isSuccess={value >= 4} isCritical={value === 6} />
                  ))}
                </div>
              </div>
              <Button onClick={handleConfirmAttack} disabled={isLoading || disabled} className="w-full" size="sm">
                {t('combat.action.attack')}
              </Button>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={() => setView('menu')} className="mt-auto w-full">
            {t('common.back')}
          </Button>
        </div>
      )}

      {view === 'doctrine' && (
        <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-3">
          <DoctrinePanel
            showUseControls
            currentMana={currentClass.mana}
            onUseDoctrine={handleDoctrineUse}
            isUsingDoctrine={isLoading}
            horizontal
          />
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
                  {consumable.effect.healMana && (
                    <span className="ml-auto text-xs text-blue-400">+{consumable.effect.healMana} MP</span>
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
