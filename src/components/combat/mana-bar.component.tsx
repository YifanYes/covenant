'use client'
import { cn } from '@/lib/cn.lib'

interface ManaBarProps {
  current: number
  max: number
  className?: string
  showLabel?: boolean
}

export default function ManaBar({ current, max, className, showLabel = true }: ManaBarProps) {
  const percentage = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="bg-muted relative h-2.5 flex-1 overflow-hidden rounded-full">
        <div
          className="absolute inset-y-0 left-0 bg-blue-500 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-muted-foreground min-w-12 text-right text-xs font-medium">
          {current}/{max}
        </span>
      )}
    </div>
  )
}
