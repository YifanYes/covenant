'use client'
import { cn } from '@/lib/cn.lib'
import type { Task } from '@/types/models.types'
import { getAreaStylesAndIcon } from '@/utils/areas.utils'
import { getColorClasses, getPriorityStyles } from '@/utils/theme.utils'
import dayjs from 'dayjs'
import { useTranslation } from 'react-i18next'
import { getTaskType, getUpcomingTaskAreas } from './upcoming-task-card.utils'

interface UpcomingTaskCardProps {
  task: Task
}

export default function UpcomingTaskCardComponent({ task }: UpcomingTaskCardProps) {
  const { t } = useTranslation()
  const taskAreas = getUpcomingTaskAreas(task)
  const taskType = getTaskType(task.effort, task.impact, t)
  const colorClass = task.color
    ? getColorClasses(task.color, { bg: 'bg-muted', text: 'text-muted-foreground' }).bg
    : 'bg-muted'
  const taskDate = dayjs(task.dueDate).format('DD MMM')
  const priorityStyles = getPriorityStyles(task.effort, task.impact)

  return (
    <div className="border-input flex h-full w-full flex-col gap-3 rounded-md border p-4 transition-all">
      <div className="flex items-center gap-4">
        <div className={cn('h-3 w-3 shrink-0 rounded-full', colorClass)} />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-foreground text-sm font-semibold">{task.title}</h3>
            {task.dueDate && <span className="text-muted-foreground mt-0.5 text-xs whitespace-nowrap">{taskDate}</span>}
          </div>
          {(task.effort || task.impact || (task.objectives && task.objectives.length > 0) || taskAreas.length > 0) && (
            <div className="mt-1 flex flex-wrap items-center gap-4">
              {(task.effort || task.impact) && (
                <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase', priorityStyles)}>
                  {taskType}
                </span>
              )}
              {taskAreas.length > 0 && (
                <div className="flex items-center gap-1">
                  {taskAreas.map((area) => {
                    const { icon, styles } = getAreaStylesAndIcon(area)
                    return !icon || !styles ? null : (
                      <div key={area.publicId} title={t(area.name)} className="flex items-center">
                        <icon.component className={cn('size-3.5', styles)} />
                      </div>
                    )
                  })}
                </div>
              )}
              {task.objectives && task.objectives.length > 0 && (
                <div className="flex flex-wrap items-center gap-2">
                  {task.objectives.map((objective: any) => (
                    <span
                      key={objective.id}
                      className="text-muted-foreground border-muted-foreground/30 rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase"
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
