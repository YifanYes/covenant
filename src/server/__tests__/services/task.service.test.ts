import { CAMPAIGN_EVENT_TYPE } from '@/shared/constants/guild-campaigns.constants'
import { MANA_REWARDS } from '@/shared/constants/rewards.constants'
import {
  TaskEffort,
  TaskImpact,
  type CreateTaskType,
  type UpdateTaskType
} from '@shared/schemas/tasks.schemas'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { TaskRepository } from '../../repositories/task.repository'
import type { UserTaskStatusRepository } from '../../repositories/user-task-status.repository'
import type { GuildService } from '../../services/guild.service'
import type { ManaService } from '../../services/mana.service'
import { TaskService } from '../../services/task.service'
import { createRepoMock } from '../helpers/mock-repo'

const TODO_ID = 'status-todo'
const DOING_ID = 'status-doing'
const DONE_ID = 'status-done'

describe('TaskService', () => {
  let taskService: TaskService
  let mockTaskRepo: ReturnType<typeof createRepoMock<TaskRepository>>
  let mockStatusRepo: ReturnType<typeof createRepoMock<UserTaskStatusRepository>>
  let mockManaService: ReturnType<typeof createRepoMock<ManaService>>
  let mockGuildService: ReturnType<typeof createRepoMock<GuildService>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockTaskRepo = createRepoMock<TaskRepository>()
    mockTaskRepo.bulkUpdate.mockResolvedValue(undefined)

    mockStatusRepo = createRepoMock<UserTaskStatusRepository>()
    mockStatusRepo.findDoneByUserId.mockResolvedValue({
      id: DONE_ID,
      userId: 'user-1',
      label: 'DONE',
      color: 'green',
      isDefault: false,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    mockManaService = createRepoMock<ManaService>()
    mockManaService.addManaFromCompletion.mockResolvedValue({
      success: true,
      amount: 0,
      manaApplied: 0,
      reserveGained: 0,
      newMana: 0,
      newReserve: 0
    })
    mockManaService.addManaFromCompletions.mockResolvedValue({
      success: true,
      amount: 0,
      manaApplied: 0,
      reserveGained: 0,
      newMana: 0,
      newReserve: 0
    })

    mockGuildService = createRepoMock<GuildService>()
    mockGuildService.recordCampaignEvent.mockResolvedValue(undefined)

    taskService = new TaskService(mockTaskRepo, mockStatusRepo, mockManaService, mockGuildService)
  })

  describe('create', () => {
    it('should create a task', async () => {
      const input = { title: 'New Task' } as unknown as CreateTaskType
      const createdTask = { id: 'task-1', ...input }
      mockTaskRepo.create.mockResolvedValue(createdTask)

      const result = await taskService.create('user-1', input)
      expect(result.task).toEqual(createdTask)
      expect(mockTaskRepo.create).toHaveBeenCalledWith('user-1', input)
    })
  })

  describe('update', () => {
    it('should award mana when completing a high-impact task', async () => {
      const userId = 'user-1'
      const taskId = 'task-1'
      mockTaskRepo.findByIdOrThrow.mockResolvedValue({
        statusId: TODO_ID,
        impact: TaskEffort.HIGH,
        title: 'Task'
      })

      const updateInput = { id: taskId, statusId: DONE_ID, title: 'Task' }
      mockTaskRepo.update.mockResolvedValue({ ...updateInput, impact: TaskEffort.HIGH })

      mockManaService.addManaFromCompletion.mockResolvedValue({
        success: true,
        amount: MANA_REWARDS.TASK_HIGH_IMPACT,
        manaApplied: MANA_REWARDS.TASK_HIGH_IMPACT,
        reserveGained: 0,
        newMana: MANA_REWARDS.TASK_HIGH_IMPACT,
        newReserve: 0
      })

      const result = await taskService.update(userId, updateInput as unknown as UpdateTaskType)

      expect(result.manaEarned).toBe(MANA_REWARDS.TASK_HIGH_IMPACT)
      expect(mockManaService.addManaFromCompletion).toHaveBeenCalledWith(userId, 'task', { impact: TaskEffort.HIGH })
    })

    it('should NOT award mana when just updating title', async () => {
      const userId = 'user-1'
      const taskId = 'task-1'

      mockTaskRepo.findByIdOrThrow.mockResolvedValue({ statusId: TODO_ID, title: 'Old Title' })

      const updateInput = { id: taskId, statusId: TODO_ID, title: 'New Title' }
      mockTaskRepo.update.mockResolvedValue(updateInput)

      const result = await taskService.update(userId, updateInput as unknown as UpdateTaskType)

      expect(result.manaEarned).toBe(0)
      expect(mockManaService.addManaFromCompletion).not.toHaveBeenCalled()
    })
  })

  describe('bulkUpdate', () => {
    it('should award mana and record campaign event for tasks transitioning to DONE', async () => {
      const userId = 'user-1'
      mockTaskRepo.findManyByIds.mockResolvedValue([
        { id: 'task-1', statusId: TODO_ID, impact: TaskImpact.HIGH },
        { id: 'task-2', statusId: DOING_ID, impact: TaskImpact.LOW },
        { id: 'task-3', statusId: DONE_ID, impact: TaskImpact.HIGH }
      ])
      mockManaService.addManaFromCompletions.mockResolvedValue({
        success: true,
        amount: MANA_REWARDS.TASK_HIGH_IMPACT + MANA_REWARDS.TASK_LOW_IMPACT,
        manaApplied: MANA_REWARDS.TASK_HIGH_IMPACT,
        reserveGained: MANA_REWARDS.TASK_LOW_IMPACT,
        newMana: MANA_REWARDS.TASK_HIGH_IMPACT,
        newReserve: MANA_REWARDS.TASK_LOW_IMPACT
      })

      const input = [
        { id: 'task-1', statusId: DONE_ID, order: 0 },
        { id: 'task-2', statusId: DONE_ID, order: 1 },
        { id: 'task-3', statusId: DONE_ID, order: 2 }
      ]

      const result = await taskService.bulkUpdate(userId, input)

      expect(mockTaskRepo.bulkUpdate).toHaveBeenCalledWith(userId, input, ['task-1', 'task-2'], expect.any(Date))
      expect(mockManaService.addManaFromCompletions).toHaveBeenCalledWith(userId, 'task', [
        { impact: TaskImpact.HIGH },
        { impact: TaskImpact.LOW }
      ])
      expect(mockManaService.addManaFromCompletion).not.toHaveBeenCalled()
      expect(mockGuildService.recordCampaignEvent).toHaveBeenCalledWith(userId, CAMPAIGN_EVENT_TYPE.TASK_COMPLETION, 2)
      expect(result.manaEarned).toBe(MANA_REWARDS.TASK_HIGH_IMPACT)
      expect(result.reserveGained).toBe(MANA_REWARDS.TASK_LOW_IMPACT)
    })

    it('should NOT award rewards for reorder-only or already-DONE moves', async () => {
      const userId = 'user-1'
      mockTaskRepo.findManyByIds.mockResolvedValue([
        { id: 'task-1', statusId: TODO_ID, impact: TaskImpact.HIGH },
        { id: 'task-2', statusId: DONE_ID, impact: TaskImpact.LOW }
      ])

      const input = [
        { id: 'task-1', statusId: DOING_ID, order: 0 },
        { id: 'task-2', statusId: DONE_ID, order: 1 }
      ]

      const result = await taskService.bulkUpdate(userId, input)

      expect(mockTaskRepo.bulkUpdate).toHaveBeenCalledWith(userId, input, [], expect.any(Date))
      expect(mockManaService.addManaFromCompletions).not.toHaveBeenCalled()
      expect(mockGuildService.recordCampaignEvent).not.toHaveBeenCalled()
      expect(result.manaEarned).toBe(0)
      expect(result.reserveGained).toBe(0)
    })

    it('should be a no-op when given an empty task list', async () => {
      const result = await taskService.bulkUpdate('user-1', [])
      expect(mockTaskRepo.findManyByIds).not.toHaveBeenCalled()
      expect(mockTaskRepo.bulkUpdate).not.toHaveBeenCalled()
      expect(result.manaEarned).toBe(0)
      expect(result.reserveGained).toBe(0)
    })
  })
})
