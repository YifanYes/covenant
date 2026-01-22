import BaseFormDialog from '@/common/base-form-dialog.component'
import TextInput from '@/forms/text-input.component'
import Button from '@/ui/button.component'
import { Coin } from '@nsmr/pixelart-react'
import type { InvestmentWithProgress } from '@shared/types/investment.types'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

interface ContributeToInvestmentDialogProps {
  investment: InvestmentWithProgress
  characterGold: number
  open: boolean
  onOpenChange: (open: boolean) => void
  onContribute: (amount: number) => Promise<void>
  isLoading: boolean
}

export default function ContributeToInvestmentDialog({
  investment,
  characterGold,
  open,
  onOpenChange,
  onContribute,
  isLoading
}: ContributeToInvestmentDialogProps) {
  const { t } = useTranslation()
  const [amount, setAmount] = useState<number>(Math.min(100, characterGold))

  const remainingNeeded = investment.targetAmount - investment.currentAmount
  const maxContribution = Math.min(characterGold, remainingNeeded)

  const handleSubmit = async () => {
    if (amount > 0 && amount <= characterGold) {
      await onContribute(amount)
    }
  }

  const quickAmounts = [100, 500, 1000, maxContribution].filter(
    (a, index, arr) => a <= characterGold && a > 0 && arr.indexOf(a) === index
  )

  const isSubmitDisabled = amount <= 0 || amount > characterGold

  return (
    <BaseFormDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t('investments.contribute_to', { name: t(investment.nameKey) })}
      description={investment.descriptionKey}
      onSubmit={handleSubmit}
      submitLabel='investments.contribute'
      isLoading={isLoading}
      isSubmitDisabled={isSubmitDisabled}
    >
      <div className='grid gap-4'>
        {/* Your Gold Display */}
        <div className='bg-muted/50 flex items-center justify-between rounded-lg p-3'>
          <span className='text-muted-foreground'>{t('investments.your_gold')}:</span>
          <span className='font-bold text-yellow-400'>{characterGold.toLocaleString()}</span>
          <Coin size={20} />
        </div>

        {/* Amount Input */}
        <TextInput
          type='number'
          label={t('investments.amount')}
          min={1}
          max={characterGold}
          value={amount}
          onChange={(e) => setAmount(Math.min(characterGold, Math.max(0, parseInt(e.target.value) || 0)))}
          className='text-lg font-semibold'
        />

        {/* Slider */}
        <div>
          <input
            type='range'
            min={1}
            max={maxContribution}
            value={amount}
            onChange={(e) => setAmount(parseInt(e.target.value))}
            className='accent-primary w-full'
          />
        </div>

        {/* Quick Amount Buttons */}
        <div className='flex flex-wrap gap-2'>
          {quickAmounts.map((quickAmount) => (
            <Button
              key={quickAmount}
              type='button'
              variant={amount === quickAmount ? 'default' : 'outline'}
              size='sm'
              onClick={() => setAmount(quickAmount)}
            >
              {quickAmount === maxContribution ? t('investments.max') : quickAmount.toLocaleString()}
            </Button>
          ))}
        </div>
      </div>
    </BaseFormDialog>
  )
}
