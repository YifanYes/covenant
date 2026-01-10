import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Minus, Plus } from '@nsmr/pixelart-react'
import { DICE_PER_TURN_LIMITS } from '@shared/constants/dice.constants'
import type { DiceRollResult } from '@shared/types/gamification.types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import DiceResult from './DiceResult'

interface DiceRollerProps {
  diceBank: number
  tier: number
  onRoll: (diceCount: number) => void
  isRolling: boolean
  lastResults?: DiceRollResult[]
  className?: string
  compact?: boolean
}

export default function DiceRoller({
  diceBank,
  tier,
  onRoll,
  isRolling,
  lastResults,
  className,
  compact = false
}: DiceRollerProps) {
  const { t } = useTranslation()
  const maxPerTurn = DICE_PER_TURN_LIMITS[tier] || 5
  const maxDice = Math.min(diceBank, maxPerTurn)
  const [selectedDice, setSelectedDice] = useState(Math.min(1, maxDice))

  const handleIncrement = () => {
    if (selectedDice < maxDice) {
      setSelectedDice(selectedDice + 1)
    }
  }

  const handleDecrement = () => {
    if (selectedDice > 1) {
      setSelectedDice(selectedDice - 1)
    }
  }

  const handleRoll = () => {
    if (selectedDice > 0 && selectedDice <= maxDice) {
      onRoll(selectedDice)
    }
  }

  const canRoll = diceBank > 0 && !isRolling

  return (
    <div className={cn('flex flex-col gap-4 rounded-lg border', compact ? 'p-3' : 'p-4', className)}>
      <div className='flex items-center justify-between'>
        <span className={cn('font-medium', compact ? 'text-xs' : 'text-sm')}>{t('combat.dice_to_spend')}</span>
        <span className='text-muted-foreground text-xs'>
          {t('inventory.dice_bank')}: {diceBank}
        </span>
      </div>

      <div className={cn('flex items-center justify-center', compact ? 'gap-2' : 'gap-4')}>
        <Button
          variant='outline'
          size='icon'
          className={cn(compact && 'h-8 w-8')}
          onClick={handleDecrement}
          disabled={!canRoll || selectedDice <= 1}
        >
          <Minus className='h-4 w-4' />
        </Button>
        <span
          className={cn(
            'bg-muted rounded text-center font-bold',
            compact ? 'min-w-[40px] py-1 text-lg' : 'w-16 py-2 text-2xl'
          )}
        >
          {selectedDice}
        </span>
        <Button
          variant='outline'
          size='icon'
          className={cn(compact && 'h-8 w-8')}
          onClick={handleIncrement}
          disabled={!canRoll || selectedDice >= maxDice}
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>

      <Button
        onClick={handleRoll}
        disabled={!canRoll}
        size={compact ? 'sm' : 'lg'}
        className={cn('w-full', compact && 'h-9')}
      >
        {isRolling ? (
          <span className='animate-pulse'>{t('combat.rolling')}...</span>
        ) : diceBank === 0 ? (
          t('combat.no_dice')
        ) : (
          `${t('combat.roll_dice')} (${selectedDice})`
        )}
      </Button>

      {/* Hide results in compact mode to save space, or make them very small */}
      {!compact && lastResults && lastResults.length > 0 && (
        <div className='flex flex-wrap items-center justify-center gap-2 pt-2'>
          {lastResults.map((result, index) => (
            <DiceResult key={index} value={result.value} isSuccess={result.isSuccess} isCritical={result.isCritical} />
          ))}
        </div>
      )}
    </div>
  )
}
