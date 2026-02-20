'use client'
import { cn } from '@/lib/cn.lib'
import Button from '@/ui/button.component'
import { useTranslation } from 'react-i18next'

interface DiceRollerProps {
  diceBank: number
  attackDiceCount: number
  defenseDiceCount: number
  onRoll: () => void
  isRolling: boolean
  className?: string
}

export default function DiceRoller({
  diceBank,
  attackDiceCount,
  defenseDiceCount,
  onRoll,
  isRolling,
  className
}: DiceRollerProps) {
  const { t } = useTranslation()

  const canRoll = diceBank > 0 && !isRolling

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium'>{t('combat.to_battle')}</span>
        <span className='text-muted-foreground text-xs'>
          {t('inventory.dice_bank')}: {diceBank}
        </span>
      </div>

      <div className='flex items-center justify-center gap-4 text-sm'>
        <div className='flex flex-col items-center'>
          <span className='text-muted-foreground text-xs'>{t('combat.attack_rolls')}</span>
          <span className='text-orange-500 text-xl font-bold'>{attackDiceCount}</span>
        </div>
        <div className='flex flex-col items-center'>
          <span className='text-muted-foreground text-xs'>{t('combat.defense_rolls')}</span>
          <span className='text-blue-500 text-xl font-bold'>{defenseDiceCount}</span>
        </div>
      </div>

      <Button onClick={onRoll} disabled={!canRoll} size='lg' className='w-full'>
        {isRolling ? (
          <span className='animate-pulse'>{t('combat.rolling')}...</span>
        ) : diceBank === 0 ? (
          t('combat.no_dice')
        ) : (
          t('combat.roll_dice_action')
        )}
      </Button>
    </div>
  )
}
