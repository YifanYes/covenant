import { TaskStatus } from '@shared/schemas/tasks.schemas'
import type { DashboardData } from '@shared/types/dashboard.types'
import dayjs from 'dayjs'
import type { Area, HabitCompletion, Objective, PrismaClient, Task } from '../generated/prisma'
import { AreaRepository } from '../repositories/area.repository'
import { CharacterRepository } from '../repositories/character.repository'
import { HabitRepository } from '../repositories/habit.repository'
import { TaskRepository } from '../repositories/task.repository'
import { CharacterService } from './character.service'

export class DashboardService {
  private characterService: CharacterService
  private taskRepository: TaskRepository
  private habitRepository: HabitRepository
  private areaRepository: AreaRepository
  private characterRepository: CharacterRepository

  constructor(prisma: PrismaClient) {
    this.characterService = new CharacterService(prisma)
    this.taskRepository = new TaskRepository(prisma)
    this.habitRepository = new HabitRepository(prisma)
    this.areaRepository = new AreaRepository(prisma)
    this.characterRepository = new CharacterRepository(prisma)
  }

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
    now: dayjs.Dayjs
  ) {
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

          if (isCurr) areas[area.id].thisMonth++
          if (isPrev) areas[area.id].lastMonth++

          const currentAreaLast = areas[area.id].lastCompletion ? dayjs(areas[area.id].lastCompletion) : null
          if (!currentAreaLast || date.isAfter(currentAreaLast)) {
            areas[area.id].lastCompletion = date.toISOString()
          }

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

    const [overdueCount, doingCount, doneCount, todoCount, upcomingTasks, habits, metricsTasks, allAreas, character] =
      await Promise.all([
        this.taskRepository.countOverdue(userId, now.subtract(1, 'month').toDate(), now.toDate()),
        this.taskRepository.countDoing(userId, now.subtract(1, 'month').toDate(), now.toDate()),
        this.taskRepository.countDone(
          userId,
          now.subtract(1, 'month').toDate(),
          now.startOf('day').add(1, 'day').toDate()
        ),
        this.taskRepository.countTodo(userId, now.subtract(1, 'month').toDate(), now.toDate()),
        this.taskRepository.findUpcoming(userId, 10, now.startOf('day').add(2, 'day').toDate()),
        this.habitRepository.findCompletionsByDate(userId, now.subtract(8, 'day').toDate()),
        this.taskRepository.findRecentWithObjectives(userId, now.subtract(2, 'month').toDate()),
        this.areaRepository.findWithHierarchy(userId),
        this.characterRepository.findWithClasses(userId)
      ])

    const { currentClass, maxDice, diceBank } = character
      ? this.characterService.getCharacterProgress(character)
      : { currentClass: undefined, maxDice: 0, diceBank: 0 }

    const { completedToday, totalDaily, meanHabitRate } = this.getHabitMetrics(habits as any, now)
    const { mostCommonType, mostFocusedArea, mostFocusedObjective } = this.getEfficiencyMetrics(metricsTasks as any)
    const parsedUpcomingTasks = this.parseUpcomingTasks(upcomingTasks)
    const { areas, objectives } = this.getActiveAreasAndObjectives(allAreas as any, now)

    return {
      characterName: character?.name || null,
      character: character
        ? {
            gold: character.gold,
            diceBank,
            maxDice,
            health: currentClass?.health || 5,
            mana: currentClass?.mana || 5
          }
        : null,
      upcomingTasks: parsedUpcomingTasks,
      statusStats: {
        TODO: todoCount,
        DOING: doingCount,
        DONE: doneCount,
        OVERDUE: overdueCount
      },
      habitsMetrics: { completedToday, totalDaily },
      efficiencyMetrics: { meanHabitRate, mostCommonType, mostFocusedArea, mostFocusedObjective },
      taskMetrics: { areas, objectives }
    }
  }
}
