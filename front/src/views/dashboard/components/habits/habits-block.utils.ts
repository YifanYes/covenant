import { parseTranslationKey } from '@/utils/locale.utils'
import { defaultHabitConfig } from './habits-block.config'

export const getHabitStats = ({ completedToday, totalDaily }: { completedToday: number; totalDaily: number }) => ({
  completionRate: `${totalDaily > 0 ? Math.round((completedToday / totalDaily) * 100) : 0}%`,
  chartData: [
    {
      name: parseTranslationKey(defaultHabitConfig.completed.label),
      data: completedToday,
      fill: defaultHabitConfig.completed.color
    },
    {
      name: parseTranslationKey(defaultHabitConfig.remaining.label),
      data: totalDaily - completedToday,
      fill: defaultHabitConfig.remaining.color
    }
  ]
})
