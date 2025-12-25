import type { Area, Task } from '@/types/models.types'
import { parseTranslationKey } from '@/utils/locale.utils'
import dayjs from 'dayjs'
import { areasDistributionConfig } from './AreasDistribution.config'
import type { AreasDistributionData, AreasDistributionDataItem } from './AreasDistribution.model'

export const getAreasDistributionData = (areas: Area[], tasks: Task[]) => {
  const [thisM, lastM] = [dayjs(), dayjs().subtract(1, 'month')]

  const counts = tasks.reduce(
    (acc, task) => {
      if (!task.createdAt) return acc
      const d = dayjs(task.createdAt)
      const bucket = d.isSame(thisM, 'month') ? 'curr' : d.isSame(lastM, 'month') ? 'prev' : null
      if (!bucket) return acc

      task.objectives?.forEach((obj) =>
        obj.areas?.forEach((area) => {
          acc[bucket][area.id] = (acc[bucket][area.id] || 0) + 1
        })
      )
      return acc
    },
    { curr: {} as Record<string, number>, prev: {} as Record<string, number> }
  )

  const data = areas.reduce((acc, a) => {
    const curr = counts.curr[a.id]
    const prev = counts.prev[a.id]
    return curr || prev
      ? [
          ...acc,
          {
            area: parseTranslationKey(a.name),
            icon: a.icon,
            color: a.color,
            thisMonth: curr || 0,
            lastMonth: prev || 0
          }
        ]
      : acc
  }, [] as AreasDistributionDataItem[])

  return {
    data,
    config: {
      thisMonth: {
        ...areasDistributionConfig.thisMonth,
        name: parseTranslationKey(areasDistributionConfig.thisMonth.name)
      },
      lastMonth: {
        ...areasDistributionConfig.lastMonth,
        name: parseTranslationKey(areasDistributionConfig.lastMonth.name)
      }
    } as AreasDistributionData
  }
}
