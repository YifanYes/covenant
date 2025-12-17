import { colorOptions } from '@/types/colors.types'
import { TaskEffort, TaskImpact } from '@shared/schemas/tasks.schemas'

export const getColorClasses = (
  color: string | null | undefined,
  defaultStyles: {
    bg: string
    text: string
  }
) => {
  const colorOption = colorOptions.find((colorOption) => colorOption.color === color)
  return {
    bg: colorOption?.styles ?? defaultStyles.bg,
    text: colorOption?.text ?? defaultStyles.text
  }
}

export const getPriorityStyles = (effort: string | null | undefined, impact: string | null | undefined) => {
  if (impact === TaskImpact.HIGH && effort === TaskEffort.LOW) {
    return 'border-green-400 dark:border-green-700 bg-green-700/20 dark:bg-green-700/20 text-green-700 dark:text-green-400'
  } else if (impact === TaskImpact.HIGH && effort === TaskEffort.HIGH) {
    return 'border-blue-400 dark:border-blue-600 bg-blue-600/20 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400'
  } else if (impact === TaskImpact.LOW && effort === TaskEffort.LOW) {
    return 'border-slate-400 dark:border-slate-600 bg-slate-600/20 dark:bg-slate-600/20 text-slate-700 dark:text-slate-400'
  } else if (impact === TaskImpact.LOW && effort === TaskEffort.HIGH) {
    return 'border-zinc-400 dark:border-zinc-600 bg-zinc-600/20 dark:bg-zinc-600/20 text-zinc-700 dark:text-zinc-400'
  }
  return 'bg-muted text-muted-foreground'
}

export const getPriorityTextColors = (effort: string | null | undefined, impact: string | null | undefined) => {
  if (impact === TaskImpact.HIGH && effort === TaskEffort.LOW) {
    return {
      title: 'text-green-700 dark:text-green-400',
      subtitle: 'text-green-800 dark:text-green-500'
    }
  } else if (impact === TaskImpact.HIGH && effort === TaskEffort.HIGH) {
    return {
      title: 'text-blue-700 dark:text-blue-400',
      subtitle: 'text-blue-800 dark:text-blue-500'
    }
  } else if (impact === TaskImpact.LOW && effort === TaskEffort.LOW) {
    return {
      title: 'text-slate-700 dark:text-slate-400',
      subtitle: 'text-slate-800 dark:text-slate-500'
    }
  } else if (impact === TaskImpact.LOW && effort === TaskEffort.HIGH) {
    return {
      title: 'text-zinc-700 dark:text-zinc-400',
      subtitle: 'text-zinc-800 dark:text-zinc-500'
    }
  }
  return {
    title: 'text-muted-foreground',
    subtitle: 'text-muted-foreground/80'
  }
}
