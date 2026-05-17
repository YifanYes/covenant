import { CAMPAIGN_EVENT_TYPE } from '@/shared/constants/guild-campaigns.constants'
import { MANA_REWARDS } from '@/shared/constants/rewards.constants'
import { TaskEffort, TaskImpact, TaskStatus } from '@shared/schemas/tasks.schemas'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskService } from '../../services/task.service'

describe('TaskService', () => {
  let taskService: TaskService
  let mockTaskRepo: any
  let mockManaService: any
  let mockGuildService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockTaskRepo = {
      create: vi.fn(),
      findAll: vi.fn(),
      findByIdOrThrow: vi.fn(),
      findManyByIds: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFiltered: vi.fn(),
      bulkUpdate: vi.fn().mockResolvedValue(undefined)
    }

    mockManaService = {
      addManaFromCompletion: vi.fn().mockResolvedValue({
        success: true,
        amount: 0,
        manaApplied: 0,
        reserveGained: 0,
        newMana: 0,
        newReserve: 0
      }),
      addManaFromCompletions: vi.fn().mockResolvedValue({
        success: true,
        amount: 0,
        manaApplied: 0,
        reserveGained: 0,
        newMana: 0,
        newReserve: 0
      })
    }

    mockGuildService = {
      recordCampaignEvent: vi.fn().mockResolvedValue(undefined)
    }

    taskService = new TaskService(mockTaskRepo, mockManaService, mockGuildService)
  })

  describe('create', () => {
    it('should create a task', async () => {
      const input = { title: 'New Task' } as any
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
        status: TaskStatus.TODO,
        impact: TaskEffort.HIGH,
        title: 'Task'
      })

      const updateInput = { id: taskId, status: TaskStatus.DONE, title: 'Task' }
      mockTaskRepo.update.mockResolvedValue({ ...updateInput, impact: TaskEffort.HIGH })

      mockManaService.addManaFromCompletion.mockResolvedValue({
        success: true,
        amount: MANA_REWARDS.TASK_HIGH_IMPACT,
        manaApplied: MANA_REWARDS.TASK_HIGH_IMPACT,
        reserveGained: 0,
        newMana: MANA_REWARDS.TASK_HIGH_IMPACT,
        newReserve: 0
      })

      const result = await taskService.update(userId, updateInput as any, TaskStatus.DONE)

      expect(result.manaEarned).toBe(MANA_REWARDS.TASK_HIGH_IMPACT)
      expect(mockManaService.addManaFromCompletion).toHaveBeenCalledWith(userId, 'task', { impact: TaskEffort.HIGH })
    })

    it('should NOT award mana when just updating title', async () => {
      const userId = 'user-1'
      const taskId = 'task-1'

      mockTaskRepo.findByIdOrThrow.mockResolvedValue({ status: TaskStatus.TODO, title: 'Old Title' })

      const updateInput = { id: taskId, status: TaskStatus.TODO, title: 'New Title' }
      mockTaskRepo.update.mockResolvedValue(updateInput)

      const result = await taskService.update(userId, updateInput as any, TaskStatus.TODO)

      expect(result.manaEarned).toBe(0)
      expect(mockManaService.addManaFromCompletion).not.toHaveBeenCalled()
    })
  })

  describe('bulkUpdate', () => {
    it('should award mana and record campaign event for tasks transitioning to DONE', async () => {
      const userId = 'user-1'
      mockTaskRepo.findManyByIds.mockResolvedValue([
        { id: 'task-1', status: TaskStatus.TODO, impact: TaskImpact.HIGH },
        { id: 'task-2', status: TaskStatus.DOING, impact: TaskImpact.LOW },
        { id: 'task-3', status: TaskStatus.DONE, impact: TaskImpact.HIGH }
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
        { id: 'task-1', status: TaskStatus.DONE, order: 0 },
        { id: 'task-2', status: TaskStatus.DONE, order: 1 },
        { id: 'task-3', status: TaskStatus.DONE, order: 2 }
      ]

      const result = await taskService.bulkUpdate(userId, input, TaskStatus.DONE)

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
        { id: 'task-1', status: TaskStatus.TODO, impact: TaskImpact.HIGH },
        { id: 'task-2', status: TaskStatus.DONE, impact: TaskImpact.LOW }
      ])

      const input = [
        { id: 'task-1', status: TaskStatus.DOING, order: 0 },
        { id: 'task-2', status: TaskStatus.DONE, order: 1 }
      ]

      const result = await taskService.bulkUpdate(userId, input, TaskStatus.DONE)

      expect(mockTaskRepo.bulkUpdate).toHaveBeenCalledWith(userId, input, [], expect.any(Date))
      expect(mockManaService.addManaFromCompletions).not.toHaveBeenCalled()
      expect(mockGuildService.recordCampaignEvent).not.toHaveBeenCalled()
      expect(result.manaEarned).toBe(0)
      expect(result.reserveGained).toBe(0)
    })

    it('should be a no-op when given an empty task list', async () => {
      const result = await taskService.bulkUpdate('user-1', [], TaskStatus.DONE)
      expect(mockTaskRepo.findManyByIds).not.toHaveBeenCalled()
      expect(mockTaskRepo.bulkUpdate).not.toHaveBeenCalled()
      expect(result.manaEarned).toBe(0)
      expect(result.reserveGained).toBe(0)
    })
  })
})
