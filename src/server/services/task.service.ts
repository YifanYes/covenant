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
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import { logger } from '../lib/logger'
import type { CharacterRepository } from '../repositories/character.repository'
import type { TaskRepository } from '../repositories/task.repository'
import type { UserTaskStatusRepository } from '../repositories/user-task-status.repository'
import { evaluateLoopClosed } from '../utils/loop-closed.utils'
import type { GuildService } from './guild.service'
import type { ManaService } from './mana.service'

const log = logger.child({ service: 'task' })

const notFound = () => new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })

export class TaskService {
  constructor(
    private taskRepository: TaskRepository,
    private userTaskStatusRepository: UserTaskStatusRepository,
    private manaService: ManaService,
    private guildService?: GuildService,
    private characterRepository?: CharacterRepository,
    private analytics: AnalyticsService = defaultAnalytics
  ) {}

  private async resolveTask(publicId: string, userId: string): Promise<bigint> {
    const task = await this.taskRepository.findByPublicId(publicId, userId)
    if (!task) throw notFound()
    return task.id
  }

  private async resolveStatus(publicId: string, userId: string): Promise<bigint> {
    const status = await this.userTaskStatusRepository.findByPublicId(publicId, userId)
    if (!status) throw notFound()
    return status.id
  }

  async create(userId: string, input: CreateTaskType) {
    const statusId = await this.resolveStatus(input.statusPublicId, userId)
    const task = await this.taskRepository.create(userId, input, statusId)
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
    const statuses = await this.userTaskStatusRepository.findAll(userId)
    const statusPublicIdById = new Map(statuses.map((s) => [s.id.toString(), s.publicId]))

    const decorated = tasks.map((task) => ({
      ...task,
      statusPublicId: statusPublicIdById.get(task.statusId.toString()) ?? ''
    }))

    const groupedTasks = decorated.reduce(
      (acc, task) => {
        const key = task.statusPublicId || task.statusId.toString()
        if (!acc[key]) acc[key] = []
        acc[key].push(task)
        return acc
      },
      {} as Record<string, typeof decorated>
    )

    return { tasks: groupedTasks }
  }

  async getFiltered(userId: string, input: GetTasksFilteredInput) {
    const { search, statusPublicIds, effortImpact, dueDate, page, pageSize } = input

    let statusIds: bigint[] | undefined
    if (statusPublicIds?.length) {
      const statuses = await this.userTaskStatusRepository.findAll(userId)
      const idByPublicId = new Map(statuses.map((s) => [s.publicId, s.id]))
      statusIds = statusPublicIds.map((p) => idByPublicId.get(p)).filter((id): id is bigint => id !== undefined)
    }

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

    const statuses = await this.userTaskStatusRepository.findAll(userId)
    const statusPublicIdById = new Map(statuses.map((s) => [s.id.toString(), s.publicId]))

    return {
      tasks: result.tasks.map((task) => ({
        ...task,
        statusPublicId: statusPublicIdById.get(task.statusId.toString()) ?? ''
      })),
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

    const statuses = await this.userTaskStatusRepository.findAll(userId)
    const statusPublicIdById = new Map(statuses.map((s) => [s.id.toString(), s.publicId]))

    return {
      tasks: tasks.map((task) => ({
        ...task,
        statusPublicId: statusPublicIdById.get(task.statusId.toString()) ?? ''
      }))
    }
  }

  async update(userId: string, input: UpdateTaskType) {
    const taskId = await this.resolveTask(input.publicId, userId)
    const existingTask = await this.taskRepository.findByIdOrThrow(taskId, userId)
    const doneStatus = await this.userTaskStatusRepository.findDoneByUserId(userId)
    if (!doneStatus) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DONE status missing for user' })
    }

    let nextStatusId: bigint | undefined
    if (input.statusPublicId !== undefined) {
      nextStatusId = await this.resolveStatus(input.statusPublicId, userId)
    }

    const isCompleting =
      nextStatusId !== undefined &&
      nextStatusId === doneStatus.id &&
      existingTask.statusId !== doneStatus.id

    const task = await this.taskRepository.update(taskId, input, nextStatusId, isCompleting)

    let manaEarned = 0
    let reserveGained = 0
    if (isCompleting) {
      const result = await this.manaService.addManaFromCompletion(userId, 'task', { impact: task.impact })
      manaEarned = result.manaApplied
      reserveGained = result.reserveGained
      await this.guildService?.recordCampaignEvent(userId, CAMPAIGN_EVENT_TYPE.TASK_COMPLETION, 1)

      this.analytics.track(userId, 'task_completed', {
        task_id: task.publicId,
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

  async bulkUpdate(userId: string, items: BulkUpdateTaskItem[]) {
    if (items.length === 0) {
      return { message: 'Tasks updated successfully', manaEarned: 0, reserveGained: 0 }
    }

    const doneStatus = await this.userTaskStatusRepository.findDoneByUserId(userId)
    if (!doneStatus) {
      throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DONE status missing for user' })
    }

    const statuses = await this.userTaskStatusRepository.findAll(userId)
    const statusIdByPublicId = new Map(statuses.map((s) => [s.publicId, s.id]))

    const existing = await this.taskRepository.findManyByPublicIds(items.map((t) => t.publicId), userId)
    const existingByPublicId = new Map(existing.map((t) => [t.publicId, t]))

    const resolved: Array<{ id: bigint; publicId: string; statusId: bigint; order: number }> = []
    for (const item of items) {
      const prev = existingByPublicId.get(item.publicId)
      const statusId = statusIdByPublicId.get(item.statusPublicId)
      if (!prev || statusId === undefined) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Task ${item.publicId} not found` })
      }
      resolved.push({ id: prev.id, publicId: item.publicId, statusId, order: item.order })
    }

    const completing = resolved.flatMap((r) => {
      const prev = existingByPublicId.get(r.publicId)
      if (!prev) return []
      if (r.statusId !== doneStatus.id || prev.statusId === doneStatus.id) return []
      return [{ id: r.id, publicId: r.publicId, impact: prev.impact }]
    })

    await this.taskRepository.bulkUpdate(
      userId,
      resolved.map((r) => ({ id: r.id, statusId: r.statusId, order: r.order })),
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
        task_id: task.publicId,
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

  async delete(userId: string, publicId: string) {
    const id = await this.resolveTask(publicId, userId)
    await this.taskRepository.delete(id)
    return { message: `Task ${publicId} deleted successfully` }
  }

  async duplicate(userId: string, publicId: string, titleSuffix?: string) {
    const id = await this.resolveTask(publicId, userId)
    const original = await this.taskRepository.findByIdOrThrow(id, userId)

    const statuses = await this.userTaskStatusRepository.findAll(userId)
    const originalStatus = statuses.find((s) => s.id === original.statusId)
    if (!originalStatus) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'status missing for task' })

    const newTaskInput: CreateTaskType = {
      title: `${original.title}${titleSuffix || ' (copy)'}`,
      description: original.description || undefined,
      statusPublicId: originalStatus.publicId,
      order: original.order,
      color: original.color || undefined,
      effort: (original.effort ?? undefined) as TaskEffort | undefined,
      impact: (original.impact ?? undefined) as TaskImpact | undefined,
      dueDate: original.dueDate || undefined,
      objectives: original.objectives.map((o) => o.publicId),
      areas: original.areas.map((a) => a.publicId)
    }

    const task = await this.taskRepository.create(userId, newTaskInput, original.statusId)

    return { task }
  }
}
