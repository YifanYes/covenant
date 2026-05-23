'use client'

import { cn } from '@/lib/cn.lib'
import { type ReactNode } from 'react'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  size?: 'compact' | 'default' | 'large'
  className?: string
  descriptionClassName?: string
  actionFullWidth?: boolean
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'default',
  className,
  descriptionClassName,
  actionFullWidth = false
}: EmptyStateProps) {
  const isCompact = size === 'compact'
  const isLarge = size === 'large'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        isCompact && 'py-6',
        !isCompact && !isLarge && 'min-h-64 gap-6 py-12',
        isLarge && 'min-h-96 gap-8 py-16',
        className
      )}
    >
      <div
        className={cn(
          'bg-muted flex items-center justify-center rounded-full',
          isCompact && 'h-10 w-10',
          !isCompact && !isLarge && 'h-16 w-16',
          isLarge && 'h-24 w-24'
        )}
      >
        <div
          className={cn(
            'text-muted-foreground flex items-center justify-center',
            isCompact && '[&_svg]:h-5 [&_svg]:w-5',
            !isCompact && !isLarge && '[&_svg]:h-8 [&_svg]:w-8',
            isLarge && '[&_svg]:h-12 [&_svg]:w-12'
          )}
        >
          {icon}
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h3
          className={cn(
            'font-semibold',
            isCompact && 'text-sm',
            !isCompact && !isLarge && 'text-lg',
            isLarge && 'text-2xl'
          )}
        >
          {title}
        </h3>
        <p
          className={cn(
            'text-muted-foreground whitespace-pre-line',
            isCompact && 'text-xs max-w-xs',
            !isCompact && !isLarge && 'text-sm max-w-xs',
            isLarge && 'text-base max-w-md',
            descriptionClassName
          )}
        >
          {description}
        </p>
      </div>
      {action && <div className={cn(actionFullWidth && 'flex w-full justify-center')}>{action}</div>}
    </div>
  )
}
