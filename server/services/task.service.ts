import { DICE_REWARDS } from '@shared/constants/dice.constants'
import type { BulkUpdateTaskItem, CreateTaskType, UpdateTaskType } from '@shared/schemas/tasks.schemas'
import type { PrismaClient } from '../generated/prisma'
import { TaskRepository } from '../repositories/task.repository'
import { DiceService } from './dice.service'

export class TaskService {
  private diceService: DiceService
  private taskRepository: TaskRepository

  constructor(prisma: PrismaClient) {
    this.diceService = new DiceService(prisma)
    this.taskRepository = new TaskRepository(prisma)
  }

  async create(userId: string, input: CreateTaskType) {
    const task = await this.taskRepository.create(userId, input)
    return { task }
  }

  async getAll(userId: string) {
    const tasks = await this.taskRepository.findAll(userId)

    const groupedTasks = tasks.reduce(
      (acc, task) => {
        if (!acc[task.status]) acc[task.status] = []
        acc[task.status].push(task)
        return acc
      },
      {} as Record<string, typeof tasks>
    )

    return { tasks: groupedTasks }
  }

  async getByDate(userId: string, year?: number, monthIndex?: number) {
    const y = year ?? new Date().getFullYear()
    const m = monthIndex ?? new Date().getMonth()

    const startDate = new Date(y, m, 1, 0, 0, 0, 0)
    const endDate = new Date(y, m + 1, 0, 23, 59, 59, 999)

    const tasks = await this.taskRepository.findByDate(userId, startDate, endDate)

    return { tasks }
  }

  async update(userId: string, input: UpdateTaskType, completingStatus: string) {
    const existingTask = await this.taskRepository.findByIdOrThrow(input.id, userId)

    const isCompleting = input.status === completingStatus && existingTask.status !== completingStatus

    const task = await this.taskRepository.update(input.id, input, isCompleting)

    let diceEarned = 0
    if (isCompleting) {
      const diceToAward = task.impact === 'HIGH' ? DICE_REWARDS.TASK_HIGH_IMPACT : DICE_REWARDS.TASK_LOW_IMPACT
      const result = await this.diceService.addDiceToBank(userId, diceToAward)
      diceEarned = result.earned
    }

    return { task, diceEarned }
  }

  async bulkUpdate(userId: string, tasks: BulkUpdateTaskItem[]) {
    await this.taskRepository.bulkUpdate(userId, tasks)
    return { message: 'Tasks updated successfully' }
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
      status: original.status,
      order: original.order,
      color: original.color || undefined,
      effort: original.effort as any,
      impact: original.impact as any,
      dueDate: original.dueDate || undefined,
      objectives: original.objectives.map((o: any) => o.id)
    }

    const task = await this.taskRepository.create(userId, newTaskInput)

    return { task }
  }
}
