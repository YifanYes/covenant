import { MANA_REWARDS } from '@shared/constants/rewards'
import { TaskEffort, TaskStatus } from '@shared/schemas/tasks.schemas'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskService } from '../../services/task.service'

describe('TaskService', () => {
  let taskService: TaskService
  let mockTaskRepo: any
  let mockManaService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockTaskRepo = {
      create: vi.fn(),
      findAll: vi.fn(),
      findByIdOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFiltered: vi.fn(),
      bulkUpdate: vi.fn()
    }

    mockManaService = {
      addManaFromCompletion: vi.fn().mockResolvedValue({
        success: true,
        amount: 0,
        manaApplied: 0,
        reserveGained: 0,
        newMana: 0,
        newReserve: 0
      })
    }

    taskService = new TaskService(mockTaskRepo, mockManaService)
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
})
