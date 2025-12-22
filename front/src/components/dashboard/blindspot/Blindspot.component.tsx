import { DashboardSectionWrapper } from '@/components/dashboard/DashboardSectionWrapper'
import type { Area, Task } from '@/types/models.types'
import { Alert, BullseyeArrow, Trophy } from '@nsmr/pixelart-react'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import dayjs from 'dayjs'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

interface BlindspotComponentProps {
  areas: Area[]
  tasks: Task[]
}

const getBlindspot = (items: any[], completions: Record<string, dayjs.Dayjs | null>, threshold: dayjs.Dayjs) =>
  items
    .filter((item) => !completions[item.id] || completions[item.id]!.isBefore(threshold))
    .map((item) => ({ name: item.name, lastCompletion: completions[item.id] }))

const updateIfLater = (map: Record<string, dayjs.Dayjs | null>, id: string, completionDate: dayjs.Dayjs) => {
  if (!map[id] || completionDate.isAfter(map[id])) map[id] = completionDate
}

export function BlindspotComponent({ areas, tasks }: BlindspotComponentProps) {
  const { t } = useTranslation()

  const { blindspotAreas, blindspotObjectives } = useMemo(() => {
    if (!areas || !tasks) {
      return { blindspotAreas: [], blindspotObjectives: [] }
    }

    const threshold = dayjs().subtract(2, 'weeks')
    const areaLasts: Record<string, dayjs.Dayjs | null> = Object.fromEntries(areas.map((a) => [a.id, null]))
    const objLasts: Record<string, dayjs.Dayjs | null> = {}
    const objPool = new Map<string, any>()

    tasks.forEach(({ status, updatedAt, objectives }) => {
      const completionDate = status === TaskStatus.DONE && updatedAt ? dayjs(updatedAt) : null

      objectives?.forEach((obj) => {
        objPool.set(obj.id, obj)

        if (!completionDate) {
          return
        }

        updateIfLater(objLasts, obj.id, completionDate)
        obj.areas?.forEach((area: any) => updateIfLater(areaLasts, area.id, completionDate))
      })
    })

    return {
      blindspotAreas: getBlindspot(areas, areaLasts, threshold),
      blindspotObjectives: getBlindspot(Array.from(objPool.values()), objLasts, threshold)
    }
  }, [areas, tasks])

  const renderList = (items: { name: string; lastCompletion: dayjs.Dayjs | null }[], emptyKey: string) =>
    items.length === 0 ? (
      <p className='text-muted-foreground text-xs'>{t(emptyKey)}</p>
    ) : (
      <ul className='list-inside list-disc space-y-1 text-xs'>
        {items.map((item, i) => (
          <li key={i}>
            {t(item.name)}: {item.lastCompletion ? dayjs(item.lastCompletion).fromNow(true) : '∞'}
          </li>
        ))}
      </ul>
    )

  return (
    <DashboardSectionWrapper
      title={`${t('dashboard.blindspot.title')} (${t('dashboard.blindspot.without_activity')})`}
      icon={Alert}
      iconColorClass='text-destructive'
      className='lg:col-span-2'
      contentClassName='grid gap-4 sm:grid-cols-2'
    >
      <div className='border-destructive/10 bg-destructive/5 flex max-h-[200px] flex-col rounded-lg border p-4'>
        <div className='text-destructive mb-2 flex shrink-0 items-center gap-2 text-sm font-bold'>
          <Trophy className='h-4 w-4' />
          {t('dashboard.blindspot.areas')}
        </div>
        <div className='scrollbar-thin scrollbar-thumb-destructive/20 overflow-y-auto'>
          {renderList(blindspotAreas, 'dashboard.blindspot.all_areas_covered')}
        </div>
      </div>
      <div className='border-destructive/10 bg-destructive/5 flex max-h-[200px] flex-col rounded-lg border p-4'>
        <div className='text-destructive mb-2 flex shrink-0 items-center gap-2 text-sm font-bold'>
          <BullseyeArrow className='h-4 w-4' />
          {t('dashboard.blindspot.objectives')}
        </div>
        <div className='scrollbar-thin scrollbar-thumb-destructive/20 overflow-y-auto'>
          {renderList(blindspotObjectives, 'dashboard.blindspot.all_objectives_covered')}
        </div>
      </div>
    </DashboardSectionWrapper>
  )
}
