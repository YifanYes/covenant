'use client'
import { cn } from '@/lib/cn.lib'
import { areaSimpleStyles } from '@/types/colors.types'
import { allIcons } from '@/types/icons.types'
import type { Area, Task } from '@/types/models.types'
import { getColorClasses } from '@/utils/theme.utils'
import { uniqBy } from 'es-toolkit/compat'

export type Quadrant = {
  key: string
  titleKey: string
  subtitleKey: string
  bgColor: string
  title: string
  subtitle: string
  tasks: Task[]
}

type MatrixQuadrantCardProps = {
  quadrant: Quadrant
  t: (key: string) => string
  onTaskClick: (task: Task) => void
}

export default function TaskMatrixQuadrantCard({ quadrant, t, onTaskClick }: MatrixQuadrantCardProps) {
  return (
    <div className={`flex min-h-[200px] flex-col rounded-lg p-4 ${quadrant.bgColor}`}>
      <div className='mb-4'>
        <h3 className={`text-lg font-semibold ${quadrant.title}`}>{t(quadrant.titleKey)}</h3>
        <p className={`text-sm ${quadrant.subtitle}`}>{t(quadrant.subtitleKey)}</p>
      </div>
      <div className='flex flex-1 flex-col gap-2 overflow-auto'>
        {quadrant.tasks.length === 0 ? (
          <p className='text-card-foreground m-auto text-center text-sm italic opacity-60'>
            {t('tasks.matrix.no_tasks')}
          </p>
        ) : (
          quadrant.tasks.map((task) => {
            const colorClasses = getColorClasses(task.color, {
              bg: quadrant.bgColor,
              text: quadrant.title
            })
            const taskAreas = uniqBy(task.objectives?.flatMap(({ areas = [] }) => areas) || [], ({ id }: Area) => id)
            const visibleAreas = taskAreas.slice(0, 3)
            const remainingAreas = taskAreas.length - 3

            return (
              <button
                key={task.id}
                onClick={() => onTaskClick(task)}
                className='border-foreground/20 hover:border-primary group bg-card text-card-foreground relative flex w-full cursor-pointer flex-row items-center justify-between gap-3 overflow-hidden rounded-md border-2 px-3 py-2 text-left transition-colors'
              >
                <div className='flex items-center gap-3 overflow-hidden'>
                  <div className={cn('h-3 w-3 shrink-0 rounded-full', task.color ? colorClasses.bg : 'bg-muted')} />
                  <span className='text-foreground truncate text-sm font-medium'>{task.title}</span>
                </div>

                {taskAreas.length > 0 && (
                  <div className='flex shrink-0 items-center gap-2'>
                    {visibleAreas.map(({ id, name, icon, color }) => {
                      const areaStyle = areaSimpleStyles.find(({ color: areaColor }) => areaColor === color)
                      const currentIcon = allIcons.find(({ name: iconName }) => iconName === icon)
                      return !areaStyle || !currentIcon ? null : (
                        <div key={id} title={t(name)}>
                          <currentIcon.component className={`size-3.5 ${areaStyle.styles}`} />
                        </div>
                      )
                    })}
                    {remainingAreas > 0 && (
                      <span className='text-muted-foreground text-xs font-medium'>+{remainingAreas}</span>
                    )}
                  </div>
                )}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
