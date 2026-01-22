import { useTranslation } from 'react-i18next'
import type { Payload } from 'recharts/types/component/DefaultTooltipContent'

interface AreasTooltipPayload {
  name: string
  tasksThisMonth: number
  tasksLastMonth: number
  habitsThisMonth: number
  habitsLastMonth: number
}

interface AreasDistributionTooltipProps {
  active?: boolean
  payload?: Payload<number, string>[]
}

export default function AreasDistributionTooltip({ active, payload }: AreasDistributionTooltipProps) {
  const { t } = useTranslation()

  if (!active || !payload?.length) return null

  const data = payload[0]?.payload as AreasTooltipPayload

  return (
    <div className='border-border/50 bg-background/90 min-w-48 rounded-lg border px-3 py-2 text-xs shadow-xl'>
      <p className='text-foreground mb-2 font-medium'>{data.name}</p>
      <div className='grid grid-cols-3 gap-x-3 gap-y-1'>
        <div />
        <span className='text-muted-foreground text-center text-[10px]'>
          {t('dashboard.areas_distribution.this_month')}
        </span>
        <span className='text-muted-foreground text-center text-[10px]'>
          {t('dashboard.areas_distribution.last_month')}
        </span>

        <span className='text-muted-foreground'>{t('dashboard.areas_distribution.tasks')}</span>
        <span className='text-foreground text-center font-mono'>{data.tasksThisMonth}</span>
        <span className='text-foreground text-center font-mono'>{data.tasksLastMonth}</span>

        <span className='text-muted-foreground'>{t('dashboard.areas_distribution.habits')}</span>
        <span className='text-foreground text-center font-mono'>{data.habitsThisMonth}</span>
        <span className='text-foreground text-center font-mono'>{data.habitsLastMonth}</span>
      </div>
    </div>
  )
}
