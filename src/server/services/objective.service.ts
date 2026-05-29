import type { CreateObjectiveBodyType, UpdateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import { TRPCError } from '@trpc/server'
import { analytics as defaultAnalytics, type AnalyticsService } from '../lib/analytics'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import type { ObjectiveRepository } from '../repositories/objective.repository'
import type { ManaService } from './mana.service'

const notFound = () => new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })

export class ObjectiveService {
  constructor(
    private objectiveRepository: ObjectiveRepository,
    private manaService: ManaService,
    private analytics: AnalyticsService = defaultAnalytics
  ) {}

  private async resolve(publicId: string, userId: string): Promise<bigint> {
    const objective = await this.objectiveRepository.findByPublicId(publicId, userId)
    if (!objective) throw notFound()
    return objective.id
  }

  async create(userId: string, input: CreateObjectiveBodyType) {
    const objective = await this.objectiveRepository.create(userId, input)
    return { objective }
  }

  async getAll(userId: string) {
    const objectives = await this.objectiveRepository.findAll(userId)
    return { objectives }
  }

  async update(userId: string, input: UpdateObjectiveBodyType) {
    const id = await this.resolve(input.publicId, userId)
    const objective = await this.objectiveRepository.update(id, userId, input)
    return { objective }
  }

  async complete(userId: string, publicId: string) {
    const id = await this.resolve(publicId, userId)
    const objective = await this.objectiveRepository.complete(id, userId)
    const result = await this.manaService.addManaFromCompletion(userId, 'objective')

    this.analytics.track(userId, 'objective_completed', {
      objective_id: objective.publicId,
      mana_earned: result.manaApplied,
      reserve_gained: result.reserveGained
    })

    return {
      objective,
      manaEarned: result.manaApplied,
      reserveGained: result.reserveGained
    }
  }

  async delete(userId: string, publicId: string) {
    const id = await this.resolve(publicId, userId)
    await this.objectiveRepository.delete(id, userId)
    return { message: 'Objective deleted successfully' }
  }
}
