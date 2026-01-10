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
  onNextPhase?: () => void
  isAdvancing?: boolean
  nextPhaseLabel?: string
  className?: string
}

export default function DiceRoller({
  diceBank,
  tier,
  onRoll,
  isRolling,
  lastResults,
  onNextPhase,
  isAdvancing,
  nextPhaseLabel,
  className
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
    <div className={cn('flex flex-col gap-4 rounded-lg border p-4', className)}>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>
          {onNextPhase ? t('combat.phase_complete') : t('combat.dice_to_spend')}
        </span>
        <span className='text-muted-foreground text-xs'>
          {t('inventory.dice_bank')}: {diceBank}
        </span>
      </div>

      {!onNextPhase && (
        <div className='flex items-center justify-center gap-4'>
          <Button variant='outline' size='icon' onClick={handleDecrement} disabled={!canRoll || selectedDice <= 1}>
            <Minus className='h-4 w-4' />
          </Button>
          <span className='bg-muted w-16 rounded py-2 text-center text-2xl font-bold'>{selectedDice}</span>
          <Button
            variant='outline'
            size='icon'
            onClick={handleIncrement}
            disabled={!canRoll || selectedDice >= maxDice}
          >
            <Plus className='h-4 w-4' />
          </Button>
        </div>
      )}

      {onNextPhase ? (
        <Button onClick={onNextPhase} disabled={isAdvancing} size='lg' className='w-full'>
          {isAdvancing ? <span className='animate-pulse'>{t('combat.rolling')}...</span> : nextPhaseLabel}
        </Button>
      ) : (
        <Button onClick={handleRoll} disabled={!canRoll} size='lg' className='w-full'>
          {isRolling ? (
            <span className='animate-pulse'>{t('combat.rolling')}...</span>
          ) : diceBank === 0 ? (
            t('combat.no_dice')
          ) : (
            `${t('combat.roll_dice')} (${selectedDice})`
          )}
        </Button>
      )}

      {lastResults && lastResults.length > 0 && (
        <div className='flex flex-wrap items-center justify-center gap-2 pt-2'>
          {lastResults.map((result, index) => (
            <DiceResult key={index} value={result.value} isSuccess={result.isSuccess} isCritical={result.isCritical} />
          ))}
        </div>
      )}
    </div>
  )
}
