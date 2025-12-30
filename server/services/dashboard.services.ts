import { TaskStatus } from '@shared/schemas/tasks.schemas'
import dayjs from 'dayjs'
import { Area, HabitCompletion, Objective, PrismaClient, Task } from '../generated/prisma/client'

const getMax = (record: Record<string, number>) => Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0] || null

const updateValue = (record: Record<string, number>, key: string) => {
  record[key] = (record[key] || 0) + 1
}

const getHabitMetrics = (
  habits: { completions: HabitCompletion[]; timespan: string; recurrence: number }[],
  now: dayjs.Dayjs
) => {
  const habitsTimespanExpectedModifiers: Record<string, number> = {
    DAILY: 1,
    WEEKLY: 7,
    MONTHLY: 30
  }

  const { completedToday, totalDaily } = habits.reduce(
    (acc, habit) => {
      const dailyTarget = habit.recurrence / habitsTimespanExpectedModifiers[habit.timespan]
      const expectedCompletedPerDay = Math.floor(dailyTarget)
      const completedToday = habit.completions?.filter((completion) =>
        dayjs(completion?.completedAt).isSame(now, 'day')
      )?.length
      const isCompletedToday = completedToday >= expectedCompletedPerDay ? 1 : 0

      return {
        completedToday: acc.completedToday + isCompletedToday,
        totalDaily: acc.totalDaily + (expectedCompletedPerDay > 0 ? 1 : 0)
      }
    },
    { completedToday: 0, totalDaily: 0 }
  )

  return { completedToday, totalDaily, meanHabitRate: totalDaily > 0 ? (completedToday / totalDaily) * 100 : 0 }
}

const getEfficiencyMetrics = (
  tasks: {
    impact: string | null
    effort: string | null
    objectives: { name: string; areas: { name: string }[] }[]
    status: string
  }[]
) => {
  const taskType: Record<string, Record<string, string>> = {
    HIGH: { LOW: 'QUICK_WIN', HIGH: 'MAJOR_PROJECT' },
    LOW: { LOW: 'FILL_IN', HIGH: 'THANKLESS_TASK' }
  }

  const typeCounts: Record<string, number> = {}
  const areaCounts: Record<string, number> = {}
  const objectiveCounts: Record<string, number> = {}

  tasks.forEach(({ impact, effort, objectives, status }) => {
    if (status !== TaskStatus.DONE) return
    updateValue(typeCounts, taskType[impact ?? 'LOW'][effort ?? 'LOW'])
    objectives.forEach((objective) => {
      updateValue(objectiveCounts, objective.name)
      objective.areas.forEach((area) => updateValue(areaCounts, area.name))
    })
  })

  return {
    mostCommonType: getMax(typeCounts),
    mostFocusedArea: getMax(areaCounts),
    mostFocusedObjective: getMax(objectiveCounts)
  }
}

const getActiveAreasAndObjectives = (
  allAreas: (Area & { objectives: (Objective & { tasks: Task[] })[] })[],
  now: dayjs.Dayjs
) => {
  const areas: Record<
    string,
    {
      name: string
      color: string | null
      icon: string | null
      thisMonth: number
      lastMonth: number
      lastCompletion: string | null
    }
  > = {}

  const objectives: Record<string, { name: string; lastCompletion: string | null }> = {}

  allAreas.forEach((area) => {
    // Initialize Area
    if (!areas[area.id]) {
      areas[area.id] = {
        name: area.name,
        color: area.color,
        icon: area.icon,
        thisMonth: 0,
        lastMonth: 0,
        lastCompletion: null
      }
    }

    area.objectives.forEach((objective) => {
      // Initialize Objective
      if (!objectives[objective.id]) {
        objectives[objective.id] = {
          name: objective.name,
          lastCompletion: null
        }
      }

      objective.tasks.forEach((task) => {
        if (task.status !== TaskStatus.DONE) return

        const date = dayjs(task.updatedAt)
        const isCurr = date.isSame(now, 'month')
        const isPrev = date.isSame(now.subtract(1, 'month'), 'month')

        // Update Area counts
        if (isCurr) areas[area.id].thisMonth++
        if (isPrev) areas[area.id].lastMonth++

        // Update Last Completion (Area)
        const currentAreaLast = areas[area.id].lastCompletion ? dayjs(areas[area.id].lastCompletion) : null
        if (!currentAreaLast || date.isAfter(currentAreaLast)) {
          areas[area.id].lastCompletion = date.toISOString()
        }

        // Update Last Completion (Objective)
        const currentObjLast = objectives[objective.id].lastCompletion
          ? dayjs(objectives[objective.id].lastCompletion)
          : null
        if (!currentObjLast || date.isAfter(currentObjLast)) {
          objectives[objective.id].lastCompletion = date.toISOString()
        }
      })
    })
  })

  return {
    areas: Object.values(areas),
    objectives: Object.values(objectives)
  }
}

const parseUpcomingTasks = (tasks: Task[]) => {
  return tasks.map((task) => ({
    ...task,
    createdAt: task.createdAt?.toISOString(),
    updatedAt: task.updatedAt?.toISOString(),
    dueDate: task.dueDate?.toISOString() || null
  }))
}

export const getDashboardData = async (prisma: PrismaClient, userId: string) => {
  const now = dayjs()

  const [overdueCount, doingCount, doneCount, todoCount, upcomingTasks, habits, metricsTasks, allAreas] =
    await Promise.all([
      // 1. Overdue Count
      prisma.task.count({
        where: {
          userId,
          status: { in: [TaskStatus.TODO, TaskStatus.DOING] },
          createdAt: { gte: now.subtract(1, 'month').toDate() },
          dueDate: { lt: now.toDate() }
        }
      }),
      // 2. Doing Count
      prisma.task.count({
        where: {
          userId,
          status: TaskStatus.DOING,
          createdAt: { gte: now.subtract(1, 'month').toDate() },
          dueDate: { gte: now.toDate() }
        }
      }),
      // 3. Done Count
      prisma.task.count({
        where: {
          userId,
          status: TaskStatus.DONE,
          createdAt: { gte: now.subtract(1, 'month').toDate() },
          dueDate: { lte: now.startOf('day').add(1, 'day').toDate() }
        }
      }),
      // 4. Todo Count
      prisma.task.count({
        where: {
          userId,
          status: TaskStatus.TODO,
          createdAt: { gte: now.subtract(1, 'month').toDate() },
          dueDate: { gte: now.toDate() }
        }
      }),
      // 5. Upcoming Tasks
      prisma.task.findMany({
        where: {
          userId,
          status: { not: 'DONE' },
          dueDate: { not: null, lte: now.startOf('day').add(2, 'day').toDate() }
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      }),
      // 6. Daily Habits
      prisma.habit.findMany({
        where: {
          userId,
          deletedAt: null
        },
        include: {
          completions: {
            where: {
              completedAt: { gte: now.subtract(8, 'day').toDate() }
            }
          }
        }
      }),
      // 7. Last Two Months Tasks
      prisma.task.findMany({
        where: {
          userId,
          updatedAt: { gte: now.subtract(2, 'month').toDate() }
        },
        include: {
          objectives: {
            include: { areas: true }
          }
        }
      }),
      // 8. All Areas
      prisma.area.findMany({
        where: { userId },
        include: {
          objectives: {
            include: {
              tasks: true
            }
          }
        }
      })
    ])

  const { completedToday, totalDaily, meanHabitRate } = getHabitMetrics(habits, now)
  const { mostCommonType, mostFocusedArea, mostFocusedObjective } = getEfficiencyMetrics(metricsTasks)
  const parsedUpcomingTasks = parseUpcomingTasks(upcomingTasks)
  const { areas, objectives } = getActiveAreasAndObjectives(allAreas, now)

  return {
    upcomingTasks: parsedUpcomingTasks,
    statusStats: {
      TODO: todoCount,
      DOING: doingCount,
      DONE: doneCount,
      OVERDUE: overdueCount
    },
    habitsMetrics: {
      completedToday,
      totalDaily
    },
    efficiencyMetrics: {
      meanHabitRate,
      mostCommonType,
      mostFocusedArea,
      mostFocusedObjective
    },
    taskMetrics: {
      areas,
      objectives
    }
  }
}
