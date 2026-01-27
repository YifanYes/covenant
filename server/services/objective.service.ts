import type { CreateObjectiveBodyType, UpdateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import type { ObjectiveRepository } from '../repositories/objective.repository'
import type { DiceService } from './dice.service'

export class ObjectiveService {
  constructor(
    private objectiveRepository: ObjectiveRepository,
    private diceService: DiceService
  ) {}

  async create(userId: string, input: CreateObjectiveBodyType) {
    const objective = await this.objectiveRepository.create(userId, input)
    return { objective }
  }

  async getAll(userId: string) {
    const objectives = await this.objectiveRepository.findAll(userId)
    return { objectives }
  }

  async update(userId: string, input: UpdateObjectiveBodyType) {
    await this.objectiveRepository.findByIdOrThrow(input.id, userId)
    const objective = await this.objectiveRepository.update(input.id, input)
    return { objective }
  }

  async complete(userId: string, id: string) {
    await this.objectiveRepository.findByIdOrThrow(id, userId)
    const objective = await this.objectiveRepository.complete(id)
    const result = await this.diceService.addDiceToBank(userId, 6)

    return {
      objective,
      diceEarned: result.earned
    }
  }

  async delete(userId: string, id: string) {
    await this.objectiveRepository.findByIdOrThrow(id, userId)
    await this.objectiveRepository.delete(id)
    return { message: 'Objective deleted successfully' }
  }
}
