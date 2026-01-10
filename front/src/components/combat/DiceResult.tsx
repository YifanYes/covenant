import { cn } from '@/lib/utils'

interface DiceResultProps {
  value: number
  isSuccess: boolean
  isCritical: boolean
  className?: string
}

export default function DiceResult({ value, isSuccess, isCritical, className }: DiceResultProps) {
  const getBorderColor = () => {
    if (isCritical) return 'border-yellow-500 bg-yellow-500/20'
    if (isSuccess) return 'border-emerald-500 bg-emerald-500/20'
    return 'border-red-500/50 bg-red-500/10'
  }

  const getTextColor = () => {
    if (isCritical) return 'text-yellow-400 font-bold'
    if (isSuccess) return 'text-emerald-400'
    return 'text-red-400/70'
  }

  return (
    <div
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-lg border-2 transition-all',
        'animate-in zoom-in-50 duration-300',
        getBorderColor(),
        className
      )}
    >
      <span className={cn('text-lg', getTextColor())}>{value}</span>
    </div>
  )
}
