import { cn } from '@/lib/utils'
import type { CombatLogEntry, DiceRollResult, EnemyState, InventoryCharacter } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import CombatLog from './CombatLog'
import DiceRoller from './DiceRoller'
import EnemyCard from './EnemyCard'
import HealthBar from './HealthBar'

interface CombatArenaProps {
  character: InventoryCharacter
  enemies: EnemyState[]
  combatLog: CombatLogEntry[]
  diceBank: number
  onAttack: (diceCount: number) => void
  isAttacking: boolean
  lastAttackResults?: DiceRollResult[]
  onNextPhase?: () => void
  isAdvancing?: boolean
  nextPhaseLabel?: string
  className?: string
}

export default function CombatArena({
  character,
  enemies,
  combatLog,
  diceBank,
  onAttack,
  isAttacking,
  lastAttackResults,
  onNextPhase,
  isAdvancing,
  nextPhaseLabel,
  className
}: CombatArenaProps) {
  const { t } = useTranslation()
  const currentClass = character.classes.find((c) => c.className === character.currentClass)

  if (!currentClass) return null

  // Find the first alive enemy (target)
  const targetEnemy = enemies.find((e) => e.currentHealth > 0)

  return (
    <div className={cn('grid gap-4 lg:grid-cols-[1fr_3fr]', className)}>
      {/* Left: Character Status + Dice Roller */}
      <div className='flex flex-col gap-4'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>{character.name}</h3>

          <div className='space-y-3'>
            <div>
              <div className='text-muted-foreground mb-1 flex justify-between text-xs'>
                <span>{t('inventory.health')}</span>
                <span>
                  {currentClass.health}/{currentClass.maxHealth}
                </span>
              </div>
              <HealthBar current={currentClass.health} max={currentClass.maxHealth} showLabel={false} />
            </div>

            <div>
              <div className='text-muted-foreground mb-1 flex justify-between text-xs'>
                <span>{t('inventory.mana')}</span>
                <span>
                  {currentClass.mana}/{currentClass.maxMana}
                </span>
              </div>
              <div className='bg-muted relative h-2.5 overflow-hidden rounded-full'>
                <div
                  className='absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300'
                  style={{ width: `${(currentClass.mana / currentClass.maxMana) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        <DiceRoller
          diceBank={diceBank}
          tier={character.tier}
          onRoll={onAttack}
          isRolling={isAttacking}
          lastResults={lastAttackResults}
          onNextPhase={onNextPhase}
          isAdvancing={isAdvancing}
          nextPhaseLabel={nextPhaseLabel}
        />
      </div>

      {/* Center: Enemies + Combat Log */}
      <div className='flex flex-col gap-4'>
        <div className='rounded-lg border p-4'>
          <h3 className='mb-3 font-semibold'>{t('combat.enemies')}</h3>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-3'>
            {enemies.map((enemy) => (
              <EnemyCard key={enemy.id} enemy={enemy} isTarget={targetEnemy?.id === enemy.id} />
            ))}
          </div>
        </div>

        <CombatLog entries={combatLog} className='max-h-[500px] min-h-[300px]' />
      </div>
    </div>
  )
}
