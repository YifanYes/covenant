'use client'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/cn.lib'

const alertVariants = cva(
  'relative w-full rounded-lg border px-4 py-3 text-sm grid has-[>svg]:grid-cols-[calc(var(--spacing)*4)_1fr] grid-cols-[0_1fr] has-[>svg]:gap-x-3 gap-y-0.5 items-start [&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  {
    variants: {
      variant: {
        default:
          'text-foreground border-border bg-card [&>svg]:text-foreground *:data-[slot=alert-description]:text-muted-foreground dark:bg-card dark:border-border',
        destructive:
          'text-red-900 border-red-800 bg-red-50 [&>svg]:text-red-800 *:data-[slot=alert-description]:text-red-800/90 dark:text-red-100 dark:border-red-400 dark:bg-red-900/95 dark:[&>svg]:text-red-300 dark:*:data-[slot=alert-description]:text-red-300/90',
        success:
          'text-green-900 border-green-800 bg-green-50 [&>svg]:text-green-800 *:data-[slot=alert-description]:text-green-800/90 dark:text-green-100 dark:border-green-400 dark:bg-green-900/95 dark:[&>svg]:text-green-300 dark:*:data-[slot=alert-description]:text-green-300/90'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
)

function Alert({ className, variant, ...props }: React.ComponentProps<'div'> & VariantProps<typeof alertVariants>) {
  return <div data-slot="alert" role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-title"
      className={cn('col-start-2 line-clamp-1 min-h-4 font-medium tracking-tight', className)}
      {...props}
    />
  )
}

function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn(
        'text-muted-foreground col-start-2 grid justify-items-start gap-1 text-sm [&_p]:leading-relaxed',
        className
      )}
      {...props}
    />
  )
}

export { AlertDescription, AlertTitle }
export default Alert
