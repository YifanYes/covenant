'use client'
import { cn } from '@/lib/cn.lib'
import { taskPriorityTypes } from '@/types/constants.types'
import { getPriorityStyles } from '@/utils/theme.utils'
import { useTranslation } from 'react-i18next'

interface TaskTypeBadgeProps {
  effort: string | null | undefined
  impact: string | null | undefined
  className?: string
}

export default function TaskTypeBadge({ effort, impact, className }: TaskTypeBadgeProps) {
  const { t } = useTranslation()
  const key = effort && impact ? taskPriorityTypes[impact]?.[effort] : undefined
  if (!key) return null

  return (
    <span
      className={cn(
        'rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase',
        getPriorityStyles(effort, impact),
        className
      )}
    >
      {t(key)}
    </span>
  )
}
