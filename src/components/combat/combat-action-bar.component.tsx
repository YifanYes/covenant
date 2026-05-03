'use client'
import DiceResult from '@/app/(workspace)/map/_components/dice-result.component'
import DiceRoller from '@/app/(workspace)/map/_components/dice-roller.component'
import DoctrinePanel from '@/components/doctrine-panel.component'
import { cn } from '@/lib/cn.lib'
import Button from '@/ui/button.component'
import { getConsumableById } from '@shared/constants/items'
import type { DoctrineDefinition } from '@shared/types/doctrine.types'
import { ItemType, type InventoryCharacter, type InventoryItem } from '@shared/types/gamification.types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type ActionTab = 'attack' | 'doctrine' | 'item'

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
  const [activeTab, setActiveTab] = useState<ActionTab>('attack')

  const currentClass = character.classes.find((c) => c.className === character.currentClass)!

  // Get consumables from inventory, grouped by definitionId
  const consumables = (character.inventory || []).filter((item: InventoryItem) => item.type === ItemType.CONSUMABLE)
  const groupedConsumables = consumables.reduce<Record<string, { item: InventoryItem; count: number }>>((acc, item) => {
    if (!item.definitionId) return acc
    if (acc[item.definitionId]) {
      acc[item.definitionId].count++
    } else {
      acc[item.definitionId] = { item, count: 1 }
    }
    return acc
  }, {})

  const handleDoctrineUse = (doctrine: DoctrineDefinition) => {
    onSelectDoctrine(doctrine.id)
  }

  // Auto-attack first enemy when only one target
  const handleQuickAttack = () => {
    const livingEnemies = enemies.filter((e) => e.currentHealth > 0)
    if (livingEnemies.length === 1) {
      onAttack(livingEnemies[0].id)
    }
  }

  return (
    <div className={cn('flex h-64 shrink-0 gap-3', className)}>
      {/* Left: Command list — always visible */}
      <div className="flex w-36 shrink-0 flex-col overflow-hidden rounded-lg border">
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors',
            activeTab === 'attack' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
            disabled && 'opacity-50'
          )}
          onClick={() => setActiveTab('attack')}
          disabled={disabled}
        >
          {activeTab === 'attack' && <span className="text-primary">&#9656;</span>}
          {t('combat.action.attack')}
        </button>
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors',
            activeTab === 'doctrine' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
            disabled && 'opacity-50'
          )}
          onClick={() => setActiveTab('doctrine')}
          disabled={disabled}
        >
          {activeTab === 'doctrine' && <span className="text-primary">&#9656;</span>}
          {t('combat.action.doctrine')}
        </button>
        <button
          className={cn(
            'flex items-center gap-2 px-4 py-3 text-left text-sm font-medium transition-colors',
            activeTab === 'item' ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50',
            (disabled || potionUsedThisTurn) && 'opacity-50'
          )}
          onClick={() => setActiveTab('item')}
          disabled={disabled || potionUsedThisTurn}
        >
          {activeTab === 'item' && <span className="text-primary">&#9656;</span>}
          {t('combat.action.item')}
          {potionUsedThisTurn && <span className="text-muted-foreground text-[10px]">({t('combat.potion_used')})</span>}
        </button>
        <div className="text-muted-foreground mt-auto px-4 py-2 text-xs">
          {t('inventory.dice_bank')}: {diceBank}
        </div>
      </div>

      {/* Right: Content area */}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border p-3">
        {/* Targeting mode indicator */}
        {targetingMode && selectedDoctrineId && (
          <div className="flex items-center justify-between rounded bg-amber-500/10 px-3 py-1.5 text-sm">
            <span className="text-amber-400">
              {targetingMode === 'all' ? t('combat.targeting.all') : t('combat.targeting.single')}
            </span>
            <Button variant="ghost" size="sm" onClick={onCancelDoctrine}>
              {t('common.cancel')}
            </Button>
          </div>
        )}

        {/* Attack content — sequential: dice roller, then results */}
        {activeTab === 'attack' && !targetingMode && !attackRolls && (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              {t('combat.to_battle')}
            </div>
            <DiceRoller
              diceBank={diceBank}
              attackDiceCount={currentClass.strengthAtk}
              defenseDiceCount={currentClass.strengthDef}
              onRoll={onRollDice}
              isRolling={isRolling}
              compact
            />
          </div>
        )}

        {activeTab === 'attack' && !targetingMode && attackRolls && defenseRolls && (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              {t('combat.results')}
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
              <div>
                <span className="text-muted-foreground mb-1 block text-xs">{t('combat.attack_rolls')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {attackRolls.map((value, i) => (
                    <DiceResult key={`atk-${i}`} value={value} isSuccess={value >= 4} isCritical={value === 6} />
                  ))}
                </div>
              </div>

              <div>
                <span className="text-muted-foreground mb-1 block text-xs">{t('combat.defense_rolls')}</span>
                <div className="flex flex-wrap gap-1.5">
                  {defenseRolls.map((value, i) => (
                    <DiceResult key={`def-${i}`} value={value} isSuccess={value >= 4} isCritical={value === 6} />
                  ))}
                </div>
              </div>

              <Button onClick={handleQuickAttack} disabled={isLoading || disabled} className="mt-auto w-full" size="lg">
                {t('combat.action.attack')}
              </Button>
            </div>
          </div>
        )}

        {/* Doctrine content */}
        {activeTab === 'doctrine' && !targetingMode && (
          <div className="flex flex-1 flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              {t('doctrines.title')}
            </div>
            <DoctrinePanel
              showUseControls
              currentMana={currentClass.mana}
              onUseDoctrine={handleDoctrineUse}
              isUsingDoctrine={isLoading}
              horizontal
            />
          </div>
        )}

        {/* Item content */}
        {activeTab === 'item' && !targetingMode && (
          <div className="flex flex-1 flex-col gap-2">
            <div className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              {t('inventory.items')}
            </div>
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
                      <span className="text-emerald-400 ml-auto text-xs">+{consumable.effect.healHealth} HP</span>
                    )}
                    {consumable.effect.healMana && (
                      <span className="text-blue-400 ml-auto text-xs">+{consumable.effect.healMana} MP</span>
                    )}
                  </Button>
                )
              })
            )}
          </div>
        )}
      </div>
    </div>
  )
}
