import { CAMPAIGN_EVENT_TYPE } from '@/shared/constants/guild-campaigns.constants'
import { getManaForSource } from '@/shared/constants/rewards.constants'
import {
  TaskEffort,
  TaskImpact,
  type BulkUpdateTaskItem,
  type CreateTaskType,
  type GetTasksFilteredInput,
  type UpdateTaskType
} from '@shared/schemas/tasks.schemas'
import { TRPCError } from '@trpc/server'
import { analytics as defaultAnalytics, type AnalyticsService } from '../lib/analytics'
import { logger } from '../lib/logger'
import type { CharacterRepository } from '../repositories/character.repository'
import type { TaskRepository } from '../repositories/task.repository'
import type { UserTaskStatusRepository } from '../repositories/user-task-status.repository'
import { evaluateLoopClosed } from '../utils/loop-closed.utils'
import type { GuildService } from './guild.service'
import type { ManaService } from './mana.service'

const log = logger.child({ service: 'task' })

export class TaskService {
  constructor(
    private taskRepository: TaskRepository,
    private userTaskStatusRepository: UserTaskStatusRepository,
    private manaService: ManaService,
    private guildService?: GuildService,
    private characterRepository?: CharacterRepository,
    private analytics: AnalyticsService = defaultAnalytics
  ) {}

  async create(userId: string, input: CreateTaskType) {
    const task = await this.taskRepository.create(userId, input)
    if (this.characterRepository) {
      try {
        await this.characterRepository.updateOnboardingProgress(userId, { taskCreated: true })
      } catch (err) {
        log.warn({ err, userId }, 'onboarding tick failed: taskCreated')
      }
    }
    return { task }
  }

  async getAll(userId: string) {
    const tasks = await this.taskRepository.findAll(userId)

    const groupedTasks = tasks.reduce(
      (acc, task) => {
        if (!acc[task.statusId]) acc[task.statusId] = []
        acc[task.statusId].push(task)
        return acc
      },
      {} as Record<string, typeof tasks>
    )

    return { tasks: groupedTasks }
  }

  async getFiltered(userId: string, input: GetTasksFilteredInput) {
    const { search, statusIds, effortImpact, dueDate, page, pageSize } = input

    const result = await this.taskRepository.findFiltered(
      userId,
      {
        search,
        statusIds,
        effortImpact,
        dueDate: dueDate ? new Date(dueDate) : undefined
      },
      { page, pageSize }
    )

    return {
      tasks: result.tasks,
      totalCount: result.totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(result.totalCount / pageSize)
    }
  }

  async getByDate(userId: string, year?: number, monthIndex?: number) {
    const y = year ?? new Date().getFullYear()
    const m = monthIndex ?? new Date().getMonth()

    const startDate = new Date(y, m, 1, 0, 0, 0, 0)
    const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999)

    const tasks = await this.taskRepository.findByDate(userId, startDate, endDate)

    return { tasks }
  }

  async update(userId: string, input: UpdateTaskType) {
    const existingTask = await this.taskRepository.findByIdOrThrow(input.id, userId)
    const doneStatus = await this.userTaskStatusRepository.findDoneByUserId(userId)
    if (!doneStatus) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DONE status missing for user' })
    }

    const isCompleting =
      input.statusId !== undefined &&
      input.statusId === doneStatus.id &&
      existingTask.statusId !== doneStatus.id

    const task = await this.taskRepository.update(input.id, input, isCompleting)

    let manaEarned = 0
    let reserveGained = 0
    if (isCompleting) {
      const result = await this.manaService.addManaFromCompletion(userId, 'task', { impact: task.impact })
      manaEarned = result.manaApplied
      reserveGained = result.reserveGained
      await this.guildService?.recordCampaignEvent(userId, CAMPAIGN_EVENT_TYPE.TASK_COMPLETION, 1)

      this.analytics.track(userId, 'task_completed', {
        task_id: task.id,
        impact: task.impact ?? '',
        mana_earned: manaEarned,
        reserve_gained: reserveGained
      })

      if (this.characterRepository) {
        await evaluateLoopClosed(userId, this.characterRepository, this.analytics)
      }
    }

    return { task, manaEarned, reserveGained }
  }

  async bulkUpdate(userId: string, tasks: BulkUpdateTaskItem[]) {
    if (tasks.length === 0) {
      return { message: 'Tasks updated successfully', manaEarned: 0, reserveGained: 0 }
    }

    const doneStatus = await this.userTaskStatusRepository.findDoneByUserId(userId)
    if (!doneStatus) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DONE status missing for user' })
    }

    const existing = await this.taskRepository.findManyByIds(
      tasks.map((t) => t.id),
      userId
    )
    const existingById = new Map(existing.map((t) => [t.id, t]))

    const completing = tasks.flatMap((t) => {
      const prev = existingById.get(t.id)
      if (!prev) return []
      if (t.statusId !== doneStatus.id || prev.statusId === doneStatus.id) return []
      return [{ id: t.id, impact: prev.impact }]
    })

    await this.taskRepository.bulkUpdate(
      userId,
      tasks,
      completing.map((c) => c.id),
      new Date()
    )

    if (completing.length === 0) {
      return { message: 'Tasks updated successfully', manaEarned: 0, reserveGained: 0 }
    }

    const manaResult = await this.manaService.addManaFromCompletions(
      userId,
      'task',
      completing.map((c) => ({ impact: c.impact }))
    )

    await this.guildService?.recordCampaignEvent(userId, CAMPAIGN_EVENT_TYPE.TASK_COMPLETION, completing.length)

    let remainingManaApplied = manaResult.manaApplied
    for (const task of completing) {
      const amount = getManaForSource('task', { impact: task.impact })
      const manaEarned = Math.min(amount, remainingManaApplied)
      remainingManaApplied -= manaEarned
      this.analytics.track(userId, 'task_completed', {
        task_id: task.id,
        impact: task.impact ?? '',
        mana_earned: manaEarned,
        reserve_gained: amount - manaEarned
      })
    }

    if (this.characterRepository) {
      await evaluateLoopClosed(userId, this.characterRepository, this.analytics)
    }

    return {
      message: 'Tasks updated successfully',
      manaEarned: manaResult.manaApplied,
      reserveGained: manaResult.reserveGained
    }
  }

  async delete(userId: string, id: string) {
    await this.taskRepository.findByIdOrThrow(id, userId)
    await this.taskRepository.delete(id)

    return { message: `Task ${id} deleted successfully` }
  }

  async duplicate(userId: string, id: string, titleSuffix?: string) {
    const original = await this.taskRepository.findByIdOrThrow(id, userId)

    const newTaskInput: CreateTaskType = {
      title: `${original.title}${titleSuffix || ' (copy)'}`,
      description: original.description || undefined,
      statusId: original.statusId,
      order: original.order,
      color: original.color || undefined,
      effort: (original.effort ?? undefined) as TaskEffort | undefined,
      impact: (original.impact ?? undefined) as TaskImpact | undefined,
      dueDate: original.dueDate || undefined,
      objectives: original.objectives.map((o) => o.id),
      areas: original.areas.map((a) => a.id)
    }

    const task = await this.taskRepository.create(userId, newTaskInput)

    return { task }
  }
}
