import { MANA_REWARDS } from '@/shared/constants/rewards.constants'
import type { CreateObjectiveBodyType, UpdateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObjectiveRepository } from '../../repositories/objective.repository'
import type { ManaService } from '../../services/mana.service'
import { ObjectiveService } from '../../services/objective.service'
import { createRepoMock } from '../helpers/mock-repo'

const OBJ_PUB = 'objpub000001'

describe('ObjectiveService', () => {
  let objectiveService: ObjectiveService
  let mockObjectiveRepo: ReturnType<typeof createRepoMock<ObjectiveRepository>>
  let mockManaService: ReturnType<typeof createRepoMock<ManaService>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockObjectiveRepo = createRepoMock<ObjectiveRepository>()
    mockManaService = createRepoMock<ManaService>()
    mockManaService.addManaFromCompletion.mockResolvedValue({
      success: true,
      amount: MANA_REWARDS.OBJECTIVE,
      manaApplied: MANA_REWARDS.OBJECTIVE,
      reserveGained: 0,
      newMana: MANA_REWARDS.OBJECTIVE,
      newReserve: 0
    })

    objectiveService = new ObjectiveService(mockObjectiveRepo, mockManaService)
  })

  describe('create', () => {
    it('creates objective via repo', async () => {
      const input = { name: 'Ship feature' } as unknown as CreateObjectiveBodyType
      const created = { id: BigInt(1), publicId: OBJ_PUB, name: 'Ship feature' }
      mockObjectiveRepo.create.mockResolvedValue(created)

      const result = await objectiveService.create('user-1', input)

      expect(result.objective).toEqual(created)
      expect(mockObjectiveRepo.create).toHaveBeenCalledWith('user-1', input)
    })
  })

  describe('getAll', () => {
    it('returns objectives wrapped', async () => {
      mockObjectiveRepo.findAll.mockResolvedValue([
        { id: BigInt(1), publicId: 'objpub000001' },
        { id: BigInt(2), publicId: 'objpub000002' }
      ])
      const { objectives } = await objectiveService.getAll('user-1')
      expect(objectives).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('resolves publicId then updates', async () => {
      const input = { publicId: OBJ_PUB, name: 'Renamed' } as unknown as UpdateObjectiveBodyType
      mockObjectiveRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: OBJ_PUB })
      mockObjectiveRepo.update.mockResolvedValue({ id: BigInt(1), publicId: OBJ_PUB, name: 'Renamed' })

      const result = await objectiveService.update('user-1', input)

      expect(mockObjectiveRepo.findByPublicId).toHaveBeenCalledWith(OBJ_PUB, 'user-1')
      expect(mockObjectiveRepo.update).toHaveBeenCalledWith(BigInt(1), 'user-1', input)
      expect(result.objective).toEqual({ id: BigInt(1), publicId: OBJ_PUB, name: 'Renamed' })
    })
  })

  describe('complete', () => {
    it('completes objective and grants mana', async () => {
      mockObjectiveRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: OBJ_PUB })
      mockObjectiveRepo.complete.mockResolvedValue({ id: BigInt(1), publicId: OBJ_PUB, completedAt: new Date() })

      const result = await objectiveService.complete('user-1', OBJ_PUB)

      expect(mockObjectiveRepo.complete).toHaveBeenCalledWith(BigInt(1), 'user-1')
      expect(mockManaService.addManaFromCompletion).toHaveBeenCalledWith('user-1', 'objective')
      expect(result.manaEarned).toBe(MANA_REWARDS.OBJECTIVE)
      expect(result.reserveGained).toBe(0)
    })

    it('returns reserveGained when mana overflows', async () => {
      mockObjectiveRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: OBJ_PUB })
      mockObjectiveRepo.complete.mockResolvedValue({ id: BigInt(1), publicId: OBJ_PUB })
      mockManaService.addManaFromCompletion.mockResolvedValue({
        success: true,
        amount: MANA_REWARDS.OBJECTIVE,
        manaApplied: 4,
        reserveGained: 6,
        newMana: 50,
        newReserve: 6
      })

      const result = await objectiveService.complete('user-1', OBJ_PUB)

      expect(result.manaEarned).toBe(4)
      expect(result.reserveGained).toBe(6)
    })
  })

  describe('delete', () => {
    it('delegates to repo', async () => {
      mockObjectiveRepo.findByPublicId.mockResolvedValue({ id: BigInt(1), publicId: OBJ_PUB })
      const result = await objectiveService.delete('user-1', OBJ_PUB)
      expect(mockObjectiveRepo.delete).toHaveBeenCalledWith(BigInt(1), 'user-1')
      expect(result.message).toBe('Objective deleted successfully')
    })
  })
})
