import type { CreateObjectiveBodyType, UpdateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import type { ObjectiveRepository } from '../repositories/objective.repository'
import type { ManaService } from './mana.service'

export class ObjectiveService {
  constructor(
    private objectiveRepository: ObjectiveRepository,
    private manaService: ManaService
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
    const objective = await this.objectiveRepository.update(input.id, userId, input)
    return { objective }
  }

  async complete(userId: string, id: string) {
    const objective = await this.objectiveRepository.complete(id, userId)
    const result = await this.manaService.addManaFromCompletion(userId, 'objective')

    return {
      objective,
      manaEarned: result.manaApplied,
      reserveGained: result.reserveGained
    }
  }

  async delete(userId: string, id: string) {
    await this.objectiveRepository.delete(id, userId)
    return { message: 'Objective deleted successfully' }
  }
}
