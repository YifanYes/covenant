import { cn } from '@/lib/cn.lib'
import Button from '@/ui/button.component'
import { Minus, Plus } from '@nsmr/pixelart-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

interface DiceRollerProps {
  diceBank: number
  diceLimit: number
  onRoll: (diceCount: number) => void
  isRolling: boolean
  customButtonLabel?: string
  className?: string
  title?: string
}

export default function DiceRoller({
  diceBank,
  onRoll,
  isRolling,
  customButtonLabel,
  className,
  diceLimit,
  title
}: DiceRollerProps) {
  const { t } = useTranslation()
  const [selectedDice, setSelectedDice] = useState(diceLimit)

  useEffect(() => {
    setSelectedDice(diceLimit)
  }, [diceLimit])

  const handleIncrement = () => {
    if (selectedDice < diceLimit) {
      setSelectedDice(selectedDice + 1)
    }
  }

  const handleDecrement = () => {
    if (selectedDice > 1) {
      setSelectedDice(selectedDice - 1)
    }
  }

  const handleRoll = () => {
    if (selectedDice > 0 && selectedDice <= diceLimit) {
      onRoll(selectedDice)
      setSelectedDice(diceLimit)
    }
  }

  const canRoll = diceBank > 0 && !isRolling

  return (
    <div className={cn('flex flex-col gap-4 rounded-lg border p-4', className)}>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>{title || t('combat.dice_to_spend')}</span>
        <span className='text-muted-foreground text-xs'>
          {t('inventory.dice_bank')}: {diceBank}
        </span>
      </div>

      <div className='flex items-center justify-center gap-4'>
        <Button variant='outline' size='icon' onClick={handleDecrement} disabled={!canRoll || selectedDice <= 1}>
          <Minus className='h-4 w-4' />
        </Button>
        <span className='bg-muted w-16 rounded py-2 text-center text-2xl font-bold'>{selectedDice}</span>
        <Button
          variant='outline'
          size='icon'
          onClick={handleIncrement}
          disabled={!canRoll || selectedDice >= diceLimit}
        >
          <Plus className='h-4 w-4' />
        </Button>
      </div>

      <Button onClick={handleRoll} disabled={!canRoll} size='lg' className='w-full'>
        {isRolling ? (
          <span className='animate-pulse'>{t('combat.rolling')}...</span>
        ) : diceBank === 0 ? (
          t('combat.no_dice')
        ) : (
          `${customButtonLabel || t('combat.roll_dice')} (${selectedDice})`
        )}
      </Button>
    </div>
  )
}
