import { cn } from '@/lib/utils'
import { areaSimpleStyles } from '@/types/colors.types'
import { taskPriorityTypes } from '@/types/constants.types'
import { allIcons } from '@/types/icons.types'
import type { Area, Task } from '@/types/models.types'
import { getColorClasses, getPriorityStyles } from '@/utils/theme.utils'
import dayjs from 'dayjs'
import { uniqBy } from 'es-toolkit/compat'
import { useTranslation } from 'react-i18next'

interface UpcomingTaskCardProps {
  task: Task
}

export function UpcomingTaskCardComponent({ task }: UpcomingTaskCardProps) {
  const { t } = useTranslation()

  const taskAreas = uniqBy(task.objectives?.flatMap(({ areas = [] }) => areas) || [], ({ id }: Area) => id)

  const getTaskType = (effort: string | null | undefined, impact: string | null | undefined): string => {
    if (!effort || !impact) return '-'
    const key = taskPriorityTypes[impact]?.[effort]
    return key ? t(key) : '-'
  }

  return (
    <div className='border-input flex h-full w-full flex-col gap-3 rounded-md border p-4 transition-all'>
      <div className='flex items-start gap-4'>
        <div
          className={cn(
            'mt-1.5 h-3 w-3 shrink-0 rounded-full',
            task.color ? getColorClasses(task.color, { bg: 'bg-muted', text: 'text-muted-foreground' }).bg : 'bg-muted'
          )}
        />
        <div className='flex flex-1 flex-col gap-1'>
          <div className='flex items-start justify-between gap-2'>
            <h3 className='text-foreground text-sm font-semibold'>{task.title}</h3>
            {task.dueDate && (
              <span className='text-muted-foreground text-xs whitespace-nowrap'>
                {dayjs(task.dueDate).format('DD MMM')}
              </span>
            )}
          </div>
          {(task.effort || task.impact || (task.objectives && task.objectives.length > 0) || taskAreas.length > 0) && (
            <div className='mt-1 flex flex-wrap items-center gap-4'>
              {(task.effort || task.impact) && (
                <span
                  className={cn(
                    'rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase',
                    getPriorityStyles(task.effort, task.impact)
                  )}
                >
                  {getTaskType(task.effort, task.impact)}
                </span>
              )}
              {taskAreas.length > 0 && (
                <div className='flex items-center gap-1'>
                  {taskAreas.map(({ id, name, icon, color }: any) => {
                    const areaStyle = areaSimpleStyles.find(({ color: areaColor }) => areaColor === color)
                    const currentIcon = allIcons.find(({ name: iconName }) => iconName === icon)
                    return !areaStyle || !currentIcon ? null : (
                      <div key={id} title={t(name)} className='flex items-center'>
                        <currentIcon.component className={cn('size-3.5', areaStyle.styles)} />
                      </div>
                    )
                  })}
                </div>
              )}
              {task.objectives && task.objectives.length > 0 && (
                <div className='flex flex-wrap items-center gap-2'>
                  {task.objectives.map((objective: any) => (
                    <span
                      key={objective.id}
                      className='text-muted-foreground border-muted-foreground/30 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase'
                    >
                      {objective.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
