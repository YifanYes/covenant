'use client'

import { cn } from '@/lib/cn.lib'
import { type ReactNode } from 'react'

type EmptyStateProps = {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
  size?: 'compact' | 'default'
  className?: string
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  size = 'default',
  className
}: EmptyStateProps) {
  const isCompact = size === 'compact'

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 text-center',
        isCompact ? 'py-6' : 'min-h-64 gap-6 py-12',
        className
      )}
    >
      <div
        className={cn(
          'bg-muted flex items-center justify-center rounded-full',
          isCompact ? 'h-10 w-10' : 'h-16 w-16'
        )}
      >
        <div className={cn('text-muted-foreground', isCompact ? 'h-5 w-5' : 'h-8 w-8')}>{icon}</div>
      </div>
      <div className="flex flex-col items-center gap-1 text-center">
        <h3 className={cn('font-semibold', isCompact ? 'text-sm' : 'text-lg')}>{title}</h3>
        <p
          className={cn(
            'text-muted-foreground whitespace-pre-line max-w-xs',
            isCompact ? 'text-xs' : 'text-sm'
          )}
        >
          {description}
        </p>
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
