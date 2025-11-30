import { cn } from '@/lib/utils'

interface ClassAttributeCardProps {
  label: string
  value: string | number
  labelClassName?: string
}

export default function ClassAttributeCard({ label, value, labelClassName }: ClassAttributeCardProps) {
  return (
    <div className='bg-card flex flex-col items-center justify-center gap-2 rounded-xl border p-6 shadow-sm'>
      <span className={cn('text-muted-foreground text-sm font-medium tracking-wider uppercase', labelClassName)}>
        {label}
      </span>
      <span className='text-2xl font-bold'>{value}</span>
    </div>
  )
}
