import { DICE_REWARDS } from '@shared/constants/dice.constants'
import { TaskEffort, TaskStatus } from '@shared/schemas/tasks.schemas'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TaskService } from '../../services/task.service'
import { createMockPrisma } from '../mocks/prisma.mock'

// Mock dependencies
const mockPrisma = createMockPrisma()

vi.mock('../../repositories/task.repository', () => ({
  TaskRepository: vi.fn(function () {
    return {
      create: vi.fn(),
      findAll: vi.fn(),
      findByIdOrThrow: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFiltered: vi.fn(),
      bulkUpdate: vi.fn()
    }
  })
}))

vi.mock('../../services/dice.service', () => ({
  DiceService: vi.fn(function () {
    return {
      addDiceToBank: vi.fn().mockResolvedValue({ earned: 5, success: true })
    }
  })
}))

describe('TaskService', () => {
  let taskService: TaskService
  let mockTaskRepo: any
  let mockDiceService: any

  beforeEach(() => {
    vi.clearAllMocks()
    taskService = new TaskService(mockPrisma as any)
    mockTaskRepo = (taskService as any).taskRepository
    mockDiceService = (taskService as any).diceService
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
    it('should award dice when completing a task', async () => {
      const userId = 'user-1'
      const taskId = 'task-1'
      // Previous state: pending
      mockTaskRepo.findByIdOrThrow.mockResolvedValue({
        status: TaskStatus.TODO,
        impact: TaskEffort.HIGH,
        title: 'Task'
      })

      // Update to DONE
      const updateInput = { id: taskId, status: TaskStatus.DONE, title: 'Task' }
      mockTaskRepo.update.mockResolvedValue({ ...updateInput, impact: TaskEffort.HIGH })

      mockDiceService.addDiceToBank.mockResolvedValue({ earned: DICE_REWARDS.TASK_HIGH_IMPACT })

      const result = await taskService.update(userId, updateInput as any, TaskStatus.DONE)

      expect(result.diceEarned).toBe(DICE_REWARDS.TASK_HIGH_IMPACT)
      expect(mockDiceService.addDiceToBank).toHaveBeenCalledWith(userId, DICE_REWARDS.TASK_HIGH_IMPACT)
    })

    it('should NOT award dice when just updating title', async () => {
      const userId = 'user-1'
      const taskId = 'task-1'

      // Previous state: pending
      mockTaskRepo.findByIdOrThrow.mockResolvedValue({ status: TaskStatus.TODO, title: 'Old Title' })

      // Update title, status stays PENDING
      const updateInput = { id: taskId, status: TaskStatus.TODO, title: 'New Title' }
      mockTaskRepo.update.mockResolvedValue(updateInput)

      const result = await taskService.update(userId, updateInput as any, TaskStatus.TODO)

      expect(result.diceEarned).toBe(0)
      expect(mockDiceService.addDiceToBank).not.toHaveBeenCalled()
    })
  })
})
