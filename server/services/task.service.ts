import { DICE_REWARDS } from '@shared/constants/dice.constants'
import type {
  BulkUpdateTaskItem,
  CreateTaskType,
  GetTasksFilteredInput,
  UpdateTaskType
} from '@shared/schemas/tasks.schemas'
import type { TaskRepository } from '../repositories/task.repository'
import type { DiceService } from './dice.service'

export class TaskService {
  constructor(
    private taskRepository: TaskRepository,
    private diceService: DiceService
  ) {}

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

  async getFiltered(userId: string, input: GetTasksFilteredInput) {
    const { search, status, effortImpact, dueDate, page, pageSize } = input

    const result = await this.taskRepository.findFiltered(
      userId,
      {
        search,
        status,
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
      objectives: original.objectives.map((o: any) => o.id),
      areas: (original as any).areas?.map((a: any) => a.id) || []
    }

    const task = await this.taskRepository.create(userId, newTaskInput)

    return { task }
  }
}
