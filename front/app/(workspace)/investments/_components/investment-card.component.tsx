'use client'
import Button from '@/ui/button.component'
import { InvestmentStatus, type InvestmentWithProgress } from '@shared/types/investment.types'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface InvestmentCardProps {
  investment: InvestmentWithProgress
  onContribute: (investment: InvestmentWithProgress) => void
  characterGold: number
}

export default function InvestmentCard({ investment, onContribute, characterGold }: InvestmentCardProps) {
  const { t } = useTranslation()

  const daysRemaining = useMemo(() => {
    return Math.max(0, dayjs(investment.deadline).diff(dayjs(), 'day'))
  }, [investment.deadline])

  const getProgressColor = () => {
    if (investment.percentComplete >= 100) return 'bg-green-500'
    if (investment.percentComplete >= 75) return 'bg-emerald-500'
    if (investment.percentComplete >= 50) return 'bg-yellow-500'
    if (investment.percentComplete >= 25) return 'bg-orange-500'
    return 'bg-red-500'
  }

  return (
    <div className='border-foreground/20 bg-background flex flex-col rounded-lg border-2 p-4'>
      {/* Header */}
      <div className='mb-3 flex items-start justify-between'>
        <h3 className='text-lg font-semibold'>{t(investment.nameKey)}</h3>
        {investment.status === InvestmentStatus.COMPLETED ? (
          <span className='rounded bg-green-500/20 px-2 py-1 text-xs font-bold text-green-500'>
            {t('investments.completed')}
          </span>
        ) : (
          <span className='bg-muted text-muted-foreground rounded px-2 py-1 text-xs'>
            {daysRemaining} {t('investments.days_remaining')}
          </span>
        )}
      </div>

      {/* Description */}
      <p className='text-muted-foreground mb-4 text-sm'>{t(investment.descriptionKey)}</p>

      {/* Progress Bar */}
      <div className='mb-2'>
        <div className='bg-muted h-3 w-full overflow-hidden rounded-full'>
          <div
            className={`h-full transition-all duration-500 ${getProgressColor()}`}
            style={{ width: `${Math.min(100, investment.percentComplete)}%` }}
          />
        </div>
      </div>

      {/* Progress Stats */}
      <div className='mb-4 flex items-center justify-between text-sm'>
        <span className='text-muted-foreground'>
          <span className='text-foreground font-semibold'>{investment.currentAmount.toLocaleString()}</span>
          {' / '}
          {investment.targetAmount.toLocaleString()} {t('investments.gold')}
        </span>
        <span className={`font-bold ${investment.percentComplete >= 100 ? 'text-green-400' : 'text-muted-foreground'}`}>
          {investment.percentComplete}%
        </span>
      </div>

      {/* My Contribution */}
      {investment.myContribution > 0 && (
        <div className='bg-muted/50 text-muted-foreground mb-4 rounded px-3 py-2 text-sm'>
          {t('investments.my_contribution')}:{' '}
          <span className='font-semibold text-yellow-400'>{investment.myContribution.toLocaleString()}</span>{' '}
          {t('investments.gold')}
        </div>
      )}

      {/* Contribute Button */}
      <Button
        onClick={() => onContribute(investment)}
        disabled={characterGold <= 0 || investment.status !== 'ACTIVE'}
        className='mt-auto w-full'
      >
        {t('investments.contribute')}
      </Button>
    </div>
  )
}
