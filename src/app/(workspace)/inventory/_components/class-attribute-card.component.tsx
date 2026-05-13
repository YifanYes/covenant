'use client'
import { panelChrome } from '@/components/rpg/rpg-styles'
import { cn } from '@/lib/cn.lib'

interface ClassAttributeCardProps {
  label: string
  value: string | number
  labelClassName?: string
}

export default function ClassAttributeCard({ label, value, labelClassName }: ClassAttributeCardProps) {
  return (
    <div className={cn(panelChrome, 'flex flex-col items-center justify-center gap-2 p-6')}>
      <span className={cn('text-muted-foreground text-sm font-medium tracking-wider uppercase', labelClassName)}>
        {label}
      </span>
      <span className="text-2xl font-bold">{value}</span>
    </div>
  )
}
