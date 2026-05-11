import type { Area, HabitCompletion, Objective, Task } from '@/generated/prisma'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import type { DashboardData } from '@shared/types/dashboard.types'
import dayjs from 'dayjs'
import type { AreaRepository } from '../repositories/area.repository'
import type { CharacterRepository } from '../repositories/character.repository'
import type { HabitRepository } from '../repositories/habit.repository'
import type { TaskRepository } from '../repositories/task.repository'
import type { CharacterService } from './character.service'

export class DashboardService {
  constructor(
    private characterService: CharacterService,
    private taskRepository: TaskRepository,
    private habitRepository: HabitRepository,
    private areaRepository: AreaRepository,
    private characterRepository: CharacterRepository
  ) {}

  private getMax(record: Record<string, number>) {
    return Object.entries(record).sort((a, b) => b[1] - a[1])[0]?.[0] || null
  }

  private updateValue(record: Record<string, number>, key: string) {
    record[key] = (record[key] || 0) + 1
  }

  private getHabitMetrics(
    habits: { completions: HabitCompletion[]; timespan: string; recurrence: number }[],
    now: dayjs.Dayjs
  ) {
    const habitsTimespanExpectedModifiers: Record<string, number> = {
      DAILY: 1,
      WEEKLY: 7,
      MONTHLY: 30
    }

    const dailyHabits = habits.filter((habit) => habit.timespan === 'DAILY')

    const { completedToday, totalDaily } = dailyHabits.reduce(
      (acc, habit) => {
        const completedTodayCount = habit.completions?.filter((completion) =>
          dayjs(completion?.completedAt).isSame(now, 'day')
        )?.length
        const isCompletedToday = completedTodayCount >= habit.recurrence ? 1 : 0

        return {
          completedToday: acc.completedToday + isCompletedToday,
          totalDaily: acc.totalDaily + 1
        }
      },
      { completedToday: 0, totalDaily: 0 }
    )

    const daysToCheck = 8
    const dailyRates: number[] = []

    for (let i = 0; i < daysToCheck; i++) {
      const checkDate = now.subtract(i, 'day')
      let completedOnDay = 0
      let expectedOnDay = 0

      habits.forEach((habit) => {
        const dailyTarget = habit.recurrence / habitsTimespanExpectedModifiers[habit.timespan]
        const expectedCompletedPerDay = Math.floor(dailyTarget)

        if (expectedCompletedPerDay > 0) {
          expectedOnDay++
          const completedCount =
            habit.completions?.filter((completion) => dayjs(completion?.completedAt).isSame(checkDate, 'day'))
              ?.length || 0
          if (completedCount >= expectedCompletedPerDay) {
            completedOnDay++
          }
        }
      })

      if (expectedOnDay > 0) {
        dailyRates.push((completedOnDay / expectedOnDay) * 100)
      }
    }

    const meanHabitRate =
      dailyRates.length > 0 ? Math.min(100, dailyRates.reduce((sum, rate) => sum + rate, 0) / dailyRates.length) : 0

    return { completedToday, totalDaily, meanHabitRate }
  }

  private getEfficiencyMetrics(
    tasks: {
      impact: string | null
      effort: string | null
      objectives: { name: string; areas: { name: string }[] }[]
      status: string
    }[]
  ) {
    const taskType: Record<string, Record<string, string>> = {
      HIGH: { LOW: 'QUICK_WIN', HIGH: 'MAJOR_PROJECT' },
      LOW: { LOW: 'FILL_IN', HIGH: 'THANKLESS_TASK' }
    }

    const typeCounts: Record<string, number> = {}
    const areaCounts: Record<string, number> = {}
    const objectiveCounts: Record<string, number> = {}

    tasks.forEach(({ impact, effort, objectives, status }) => {
      if (status !== TaskStatus.DONE) return
      this.updateValue(typeCounts, taskType[impact ?? 'LOW'][effort ?? 'LOW'])
      objectives.forEach((objective) => {
        this.updateValue(objectiveCounts, objective.name)
        objective.areas.forEach((area) => this.updateValue(areaCounts, area.name))
      })
    })

    return {
      mostCommonType: this.getMax(typeCounts),
      mostFocusedArea: this.getMax(areaCounts),
      mostFocusedObjective: this.getMax(objectiveCounts)
    }
  }

  private getActiveAreasAndObjectives(
    allAreas: (Area & { objectives: (Objective & { tasks: Task[] })[] })[],
    habitsWithAreas: { objectives: { areas: { id: string }[] }[]; completions: { completedAt: Date }[] }[],
    now: dayjs.Dayjs
  ) {
    const prevMonth = now.subtract(1, 'month')
    const getMonthPeriod = (date: dayjs.Dayjs) => ({
      isCurr: date.isSame(now, 'month'),
      isPrev: date.isSame(prevMonth, 'month')
    })

    type AreaData = {
      name: string
      color: string | null
      icon: string | null
      tasksThisMonth: number
      tasksLastMonth: number
      habitsThisMonth: number
      habitsLastMonth: number
      lastCompletion: string | null
    }

    const areas: Record<string, AreaData> = {}
    const objectives: Record<string, { name: string; lastCompletion: string | null }> = {}
    const countedTasksPerArea: Record<string, Set<string>> = {}

    // Initialize areas and process tasks
    for (const area of allAreas) {
      areas[area.id] ??= {
        name: area.name,
        color: area.color,
        icon: area.icon,
        tasksThisMonth: 0,
        tasksLastMonth: 0,
        habitsThisMonth: 0,
        habitsLastMonth: 0,
        lastCompletion: null
      }
      countedTasksPerArea[area.id] ??= new Set()

      for (const objective of area.objectives) {
        objectives[objective.id] ??= { name: objective.name, lastCompletion: null }

        const doneTasks = objective.tasks.filter((t) => t.status === TaskStatus.DONE)
        for (const task of doneTasks) {
          const date = dayjs(task.updatedAt)
          const { isCurr, isPrev } = getMonthPeriod(date)

          if (isCurr && !countedTasksPerArea[area.id].has(task.id)) {
            areas[area.id].tasksThisMonth++
            countedTasksPerArea[area.id].add(task.id)
          }
          if (isPrev && !countedTasksPerArea[area.id].has(`${task.id}-prev`)) {
            areas[area.id].tasksLastMonth++
            countedTasksPerArea[area.id].add(`${task.id}-prev`)
          }

          if (!areas[area.id].lastCompletion || date.isAfter(areas[area.id].lastCompletion)) {
            areas[area.id].lastCompletion = date.toISOString()
          }
          if (!objectives[objective.id].lastCompletion || date.isAfter(objectives[objective.id].lastCompletion)) {
            objectives[objective.id].lastCompletion = date.toISOString()
          }
        }
      }
    }

    // Process habits (count unique habits per area, not completions)
    for (const habit of habitsWithAreas) {
      const completionMonths = habit.completions.reduce(
        (acc, c) => {
          const { isCurr, isPrev } = getMonthPeriod(dayjs(c.completedAt))
          return { curr: acc.curr || isCurr, prev: acc.prev || isPrev }
        },
        { curr: false, prev: false }
      )

      const uniqueAreaIds = new Set(habit.objectives.flatMap((o) => o.areas.map((a) => a.id)))

      for (const areaId of uniqueAreaIds) {
        if (!areas[areaId]) continue
        if (completionMonths.curr) areas[areaId].habitsThisMonth++
        if (completionMonths.prev) areas[areaId].habitsLastMonth++
      }
    }

    return { areas: Object.values(areas), objectives: Object.values(objectives) }
  }

  private parseUpcomingTasks(tasks: Task[]): DashboardData['upcomingTasks'] {
    return tasks.map((task) => ({
      ...task,
      createdAt: task.createdAt?.toISOString(),
      updatedAt: task.updatedAt?.toISOString(),
      dueDate: task.dueDate?.toISOString() || null
    }))
  }

  async getDashboardData(userId: string): Promise<DashboardData> {
    const now = dayjs()
    const today = now.toDate()
    const previousTwoMonths = now.subtract(2, 'month').toDate()
    const lastWeek = now.subtract(1, 'week').toDate()
    const comingTwoDays = now.startOf('day').add(2, 'day').toDate()

    const [
      overdueCount,
      doingCount,
      todoCount,
      upcomingTasks,
      habits,
      habitsWithAreas,
      metricsTasks,
      allAreas,
      character
    ] = await Promise.all([
      this.taskRepository.countByStatus(userId, [TaskStatus.TODO, TaskStatus.DOING], today),
      this.taskRepository.countByStatus(userId, TaskStatus.DOING, today, 'gte', true),
      this.taskRepository.countByStatus(userId, TaskStatus.TODO, today, 'gte', true),
      this.taskRepository.findUpcoming(userId, 10, comingTwoDays),
      this.habitRepository.findCompletionsByDate(userId, lastWeek),
      this.habitRepository.findCompletionsWithAreas(userId, previousTwoMonths),
      this.taskRepository.findRecentWithObjectives(userId, previousTwoMonths),
      this.areaRepository.findWithHierarchy(userId),
      this.characterRepository.findWithClasses(userId)
    ])

    const { currentClass, manaReserve } = character
      ? this.characterService.getCharacterProgress(character)
      : { currentClass: undefined, manaReserve: 0 }

    const { completedToday, totalDaily, meanHabitRate } = this.getHabitMetrics(habits as any, now)
    const { mostCommonType, mostFocusedArea, mostFocusedObjective } = this.getEfficiencyMetrics(metricsTasks as any)
    const parsedUpcomingTasks = this.parseUpcomingTasks(upcomingTasks)
    const { areas, objectives } = this.getActiveAreasAndObjectives(allAreas as any, habitsWithAreas as any, now)

    return {
      characterName: character?.name || null,
      character: character
        ? {
            gold: character.gold,
            manaReserve,
            health: currentClass?.health ?? 0,
            maxHealth: currentClass?.maxHealth ?? 0,
            mana: currentClass?.mana ?? 0,
            maxMana: currentClass?.maxMana ?? 0
          }
        : null,
      upcomingTasks: parsedUpcomingTasks,
      statusStats: {
        TODO: todoCount,
        DOING: doingCount,
        OVERDUE: overdueCount
      },
      habitsMetrics: { completedToday, totalDaily },
      efficiencyMetrics: { meanHabitRate, mostCommonType, mostFocusedArea, mostFocusedObjective },
      taskMetrics: { areas, objectives }
    }
  }
}
