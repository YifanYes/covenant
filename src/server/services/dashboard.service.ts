import type { Area, Habit, HabitCompletion, Objective, Task } from '@/generated/prisma'
import type { DashboardData, IncompleteHabit, TrendPoint } from '@shared/types/dashboard.types'
import dayjs from 'dayjs'
import type { AreaRepository } from '../repositories/area.repository'
import type { CharacterRepository } from '../repositories/character.repository'
import type { HabitRepository } from '../repositories/habit.repository'
import type { DoneTaskWithObjectives, TaskRepository } from '../repositories/task.repository'
import type { UserTaskStatusRepository } from '../repositories/user-task-status.repository'
import type { CharacterService } from './character.service'

export class DashboardService {
  constructor(
    private characterService: CharacterService,
    private taskRepository: TaskRepository,
    private habitRepository: HabitRepository,
    private areaRepository: AreaRepository,
    private characterRepository: CharacterRepository,
    private userTaskStatusRepository: UserTaskStatusRepository
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
    }[]
  ) {
    const taskType: Record<string, Record<string, string>> = {
      HIGH: { LOW: 'QUICK_WIN', HIGH: 'MAJOR_PROJECT' },
      LOW: { LOW: 'FILL_IN', HIGH: 'THANKLESS_TASK' }
    }

    const typeCounts: Record<string, number> = {}
    const areaCounts: Record<string, number> = {}
    const objectiveCounts: Record<string, number> = {}

    tasks.forEach(({ impact, effort, objectives }) => {
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
    hierarchy: (Area & { objectives: Objective[] })[],
    doneTasks: DoneTaskWithObjectives[],
    habitsWithAreas: { objectives: { areas: { id: bigint }[] }[]; completions: { completedAt: Date }[] }[],
    now: dayjs.Dayjs,
    timezoneOffset: number
  ) {
    const offsetMs = timezoneOffset * 60 * 1000
    const toUserMonth = (d: Date): string => {
      const u = new Date(d.getTime() - offsetMs)
      return `${u.getUTCFullYear()}-${String(u.getUTCMonth() + 1).padStart(2, '0')}`
    }
    const currMonthKey = toUserMonth(now.toDate())
    const prevMonthKey = toUserMonth(now.subtract(1, 'month').toDate())

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

    for (const area of hierarchy) {
      areas[area.id.toString()] ??= {
        name: area.name,
        color: area.color,
        icon: area.icon,
        tasksThisMonth: 0,
        tasksLastMonth: 0,
        habitsThisMonth: 0,
        habitsLastMonth: 0,
        lastCompletion: null
      }
      for (const objective of area.objectives) {
        objectives[objective.id.toString()] ??= { name: objective.name, lastCompletion: null }
      }
    }

    const countedTasksPerArea = new Map<string, Set<string>>()

    for (const task of doneTasks) {
      const iso = task.completedAt.toISOString()
      const monthKey = toUserMonth(task.completedAt)
      const period: 'curr' | 'prev' | 'older' =
        monthKey === currMonthKey ? 'curr' : monthKey === prevMonthKey ? 'prev' : 'older'

      const areaIdsForTask = new Set<string>()
      for (const obj of task.objectives) {
        const objRec = objectives[obj.id.toString()]
        if (objRec && (!objRec.lastCompletion || iso > objRec.lastCompletion)) {
          objRec.lastCompletion = iso
        }
        for (const a of obj.areas) areaIdsForTask.add(a.id.toString())
      }

      const taskIdStr = task.id.toString()
      for (const areaId of areaIdsForTask) {
        const areaRec = areas[areaId]
        if (!areaRec) continue
        if (!areaRec.lastCompletion || iso > areaRec.lastCompletion) areaRec.lastCompletion = iso
        if (period === 'older') continue
        let seen = countedTasksPerArea.get(areaId)
        if (!seen) {
          seen = new Set()
          countedTasksPerArea.set(areaId, seen)
        }
        if (seen.has(taskIdStr)) continue
        seen.add(taskIdStr)
        if (period === 'curr') areaRec.tasksThisMonth++
        else areaRec.tasksLastMonth++
      }
    }

    for (const habit of habitsWithAreas) {
      let curr = false
      let prev = false
      for (const c of habit.completions) {
        const k = toUserMonth(c.completedAt)
        if (k === currMonthKey) curr = true
        else if (k === prevMonthKey) prev = true
        if (curr && prev) break
      }
      if (!curr && !prev) continue

      const uniqueAreaIds = new Set(habit.objectives.flatMap((o) => o.areas.map((a) => a.id.toString())))
      for (const areaId of uniqueAreaIds) {
        const areaRec = areas[areaId]
        if (!areaRec) continue
        if (curr) areaRec.habitsThisMonth++
        if (prev) areaRec.habitsLastMonth++
      }
    }

    return { areas: Object.values(areas), objectives: Object.values(objectives) }
  }

  private parseUpcomingTasks(
    tasks: Array<Task & { areas: Array<{ color: string | null }> }>
  ): DashboardData['upcomingTasks'] {
    return tasks.map(({ areas, ...task }) => ({
      ...task,
      id: task.id.toString(),
      statusId: task.statusId.toString(),
      userId: task.userId,
      createdAt: task.createdAt?.toISOString(),
      updatedAt: task.updatedAt?.toISOString(),
      dueDate: task.dueDate?.toISOString() || null,
      completedAt: task.completedAt?.toISOString() ?? null,
      areaColor: areas[0]?.color ?? null
    }))
  }

  private getIncompleteDailyHabits(
    habits: Array<Habit & { completions: HabitCompletion[] }>,
    now: dayjs.Dayjs
  ): IncompleteHabit[] {
    return habits
      .filter((h) => h.timespan === 'DAILY')
      .map((h) => {
        const completedToday = h.completions.filter((c) => dayjs(c.completedAt).isSame(now, 'day')).length
        return { publicId: h.publicId, name: h.name, recurrence: h.recurrence, completedToday }
      })
      .filter((h) => h.completedToday < h.recurrence)
  }

  private getCompletionsTrend(
    metricsTasks: Array<{ completedAt: Date }>,
    habitsWithCompletions: Array<{ completions: HabitCompletion[] }>,
    now: dayjs.Dayjs,
    timezoneOffset: number
  ): TrendPoint[] {
    const days = 14
    const offsetMs = timezoneOffset * 60 * 1000
    const toUserDay = (d: Date): string => {
      const u = new Date(d.getTime() - offsetMs)
      return `${u.getUTCFullYear()}-${String(u.getUTCMonth() + 1).padStart(2, '0')}-${String(u.getUTCDate()).padStart(2, '0')}`
    }
    const counts: Record<string, number> = {}
    const nowMs = now.valueOf()
    for (let i = 0; i < days; i++) {
      counts[toUserDay(new Date(nowMs - i * 24 * 60 * 60 * 1000))] = 0
    }
    for (const task of metricsTasks) {
      const key = toUserDay(task.completedAt)
      if (key in counts) counts[key]++
    }
    for (const habit of habitsWithCompletions) {
      for (const c of habit.completions) {
        const key = toUserDay(c.completedAt)
        if (key in counts) counts[key]++
      }
    }
    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }))
  }

  async getDashboardData(userId: string, timezoneOffset = 0): Promise<DashboardData> {
    const now = dayjs()
    const today = now.toDate()
    const prevMonthStart = now.startOf('month').subtract(1, 'month').toDate()
    const lastWeek = now.subtract(1, 'week').toDate()
    const todayStart = now.startOf('day').toDate()
    const comingTwoDays = now.startOf('day').add(2, 'day').toDate()

    const userStatuses = await this.userTaskStatusRepository.findAll(userId)
    const todoStatus = userStatuses.find((s) => s.label === 'TODO')
    const doingStatus = userStatuses.find((s) => s.label === 'DOING')
    const nonDoneStatusIds = userStatuses.filter((s) => s.label !== 'DONE').map((s) => s.id)

    const [
      overdueCount,
      doingCount,
      todoCount,
      upcomingTasks,
      dueSoonCount,
      habits,
      habitsWithAreas,
      habitsLastCompletion,
      metricsTasks,
      allAreas,
      character
    ] = await Promise.all([
      this.taskRepository.countByStatusIds(userId, nonDoneStatusIds, today),
      doingStatus
        ? this.taskRepository.countByStatusIds(userId, doingStatus.id, today, 'gte', true)
        : Promise.resolve(0),
      todoStatus
        ? this.taskRepository.countByStatusIds(userId, todoStatus.id, today, 'gte', true)
        : Promise.resolve(0),
      this.taskRepository.findUpcoming(userId, 10, todayStart, comingTwoDays),
      this.taskRepository.countUpcoming(userId, todayStart, comingTwoDays),
      this.habitRepository.findCompletionsByDate(userId, lastWeek),
      this.habitRepository.findCompletionsWithAreas(userId, prevMonthStart),
      this.habitRepository.findAllWithLastCompletion(userId),
      this.taskRepository.findCompletedWithObjectives(userId, prevMonthStart),
      this.areaRepository.findWithHierarchy(userId),
      this.characterRepository.findWithClasses(userId)
    ])

    const { currentClass, manaReserve } = character
      ? this.characterService.getCharacterProgress(character)
      : { currentClass: undefined, manaReserve: 0 }

    const { completedToday, totalDaily, meanHabitRate } = this.getHabitMetrics(habits, now)
    const { mostCommonType, mostFocusedArea, mostFocusedObjective } = this.getEfficiencyMetrics(metricsTasks)
    const parsedUpcomingTasks = this.parseUpcomingTasks(upcomingTasks)
    const { areas, objectives } = this.getActiveAreasAndObjectives(
      allAreas,
      metricsTasks,
      habitsWithAreas,
      now,
      timezoneOffset
    )
    const habitBlindspots = habitsLastCompletion.map((h) => ({
      name: h.name,
      lastCompletion: h.completions[0]?.completedAt?.toISOString() ?? null
    }))
    const incompleteDaily = this.getIncompleteDailyHabits(habits, now)
    const completionsTrend = this.getCompletionsTrend(metricsTasks, habitsWithAreas, now, timezoneOffset)

    const staleCutoff = now.subtract(2, 'week')
    const isStale = (lastCompletion: string | null) =>
      lastCompletion === null || dayjs(lastCompletion).isBefore(staleCutoff)
    const neglectedCount =
      areas.filter((a) => isStale(a.lastCompletion)).length +
      objectives.filter((o) => isStale(o.lastCompletion)).length +
      habitBlindspots.filter((h) => isStale(h.lastCompletion)).length

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
      habitsMetrics: { completedToday, totalDaily, incompleteDaily },
      efficiencyMetrics: { meanHabitRate, mostCommonType, mostFocusedArea, mostFocusedObjective },
      taskMetrics: { areas, objectives, habits: habitBlindspots },
      summary: { dueSoonCount, neglectedCount },
      completionsTrend
    }
  }
}
