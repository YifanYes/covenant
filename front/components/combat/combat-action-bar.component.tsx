'use client'
import { cn } from '@/lib/cn.lib'
import DiceRoller from '@/app/(workspace)/map/_components/dice-roller.component'
import DiceResult from '@/app/(workspace)/map/_components/dice-result.component'
import DoctrinePanel from '@/components/doctrine-panel.component'
import Button from '@/ui/button.component'
import { DOCTRINES } from '@shared/constants/doctrines'
import { getConsumableById } from '@shared/constants/items'
import { ItemType, type InventoryCharacter, type InventoryItem } from '@shared/types/gamification.types'
import type { DoctrineDefinition } from '@shared/types/doctrine.types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

type ActionTab = 'main' | 'doctrine' | 'item'

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
  const [activeTab, setActiveTab] = useState<ActionTab>('main')

  const currentClass = character.classes.find((c) => c.className === character.currentClass)!

  // Get consumables from inventory, grouped by definitionId
  const consumables = (character.inventory || []).filter(
    (item: InventoryItem) => item.type === ItemType.CONSUMABLE
  )
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
    setActiveTab('main')
  }

  // Auto-attack first enemy when only one target
  const handleQuickAttack = () => {
    const livingEnemies = enemies.filter((e) => e.currentHealth > 0)
    if (livingEnemies.length === 1) {
      onAttack(livingEnemies[0].id)
    }
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col rounded-lg border', className)}>
      {/* Tab buttons — fixed at top */}
      <div className="flex shrink-0 gap-2 border-b px-4 py-2">
        <Button
          variant={activeTab === 'main' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('main')}
          disabled={disabled}
        >
          {t('combat.action.attack')}
        </Button>
        <Button
          variant={activeTab === 'doctrine' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('doctrine')}
          disabled={disabled}
        >
          {t('combat.action.doctrine')}
        </Button>
        <Button
          variant={activeTab === 'item' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setActiveTab('item')}
          disabled={disabled || potionUsedThisTurn}
        >
          {t('combat.action.item')}
          {potionUsedThisTurn && <span className="text-muted-foreground ml-1 text-[10px]">({t('combat.potion_used')})</span>}
        </Button>
      </div>

      {/* Scrollable content area */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {/* Targeting mode indicator */}
        {targetingMode && selectedDoctrineId && (
          <div className="mb-3 flex items-center justify-between rounded bg-amber-500/10 px-3 py-1.5 text-sm">
            <span className="text-amber-400">
              {targetingMode === 'all'
                ? t('combat.targeting.all')
                : t('combat.targeting.single')}
            </span>
            <Button variant="ghost" size="sm" onClick={onCancelDoctrine}>
              {t('common.cancel')}
            </Button>
          </div>
        )}

        {/* Main attack tab */}
        {activeTab === 'main' && !targetingMode && (
          <div className="flex flex-col gap-3">
            {/* Dice roller */}
            {!attackRolls && (
              <DiceRoller
                diceBank={diceBank}
                attackDiceCount={currentClass.strengthAtk}
                defenseDiceCount={currentClass.strengthDef}
                onRoll={onRollDice}
                isRolling={isRolling}
              />
            )}

            {/* Dice results */}
            {attackRolls && defenseRolls && (
              <div className="space-y-3">
                {/* Attack dice */}
                <div>
                  <span className="text-muted-foreground mb-1 block text-xs">{t('combat.attack_rolls')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {attackRolls.map((value, i) => (
                      <DiceResult
                        key={`atk-${i}`}
                        value={value}
                        isSuccess={value >= 4}
                        isCritical={value === 6}
                      />
                    ))}
                  </div>
                </div>

                {/* Defense dice */}
                <div>
                  <span className="text-muted-foreground mb-1 block text-xs">{t('combat.defense_rolls')}</span>
                  <div className="flex flex-wrap gap-1.5">
                    {defenseRolls.map((value, i) => (
                      <DiceResult
                        key={`def-${i}`}
                        value={value}
                        isSuccess={value >= 4}
                        isCritical={value === 6}
                      />
                    ))}
                  </div>
                </div>

                {/* Attack button */}
                <Button
                  onClick={handleQuickAttack}
                  disabled={isLoading || disabled}
                  className="w-full"
                >
                  {t('combat.action.attack')}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Doctrine tab */}
        {activeTab === 'doctrine' && (
          <DoctrinePanel
            showUseControls
            currentMana={currentClass.mana}
            onUseDoctrine={handleDoctrineUse}
            isUsingDoctrine={isLoading}
            horizontal
          />
        )}

        {/* Item tab */}
        {activeTab === 'item' && (
          <div className="flex flex-col gap-2">
            {Object.keys(groupedConsumables).length === 0 ? (
              <p className="text-muted-foreground text-center text-sm italic">{t('combat.no_items')}</p>
            ) : (
              Object.entries(groupedConsumables).map(([defId, { item, count }]) => {
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
