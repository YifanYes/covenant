import { cn } from '@/lib/utils'

interface HealthBarProps {
  current: number
  max: number
  className?: string
  showLabel?: boolean
}

export default function HealthBar({ current, max, className, showLabel = true }: HealthBarProps) {
  const percentage = Math.max(0, Math.min(100, (current / max) * 100))

  const getBarColor = () => {
    if (percentage > 60) return 'bg-emerald-500'
    if (percentage > 30) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className='bg-muted relative h-2.5 flex-1 overflow-hidden rounded-full'>
        <div
          className={cn('absolute inset-y-0 left-0 transition-all duration-300', getBarColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className='text-muted-foreground min-w-12 text-right text-xs font-medium'>
          {current}/{max}
        </span>
      )}
    </div>
  )
}
