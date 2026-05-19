import { MANA_REWARDS } from '@/shared/constants/rewards.constants'
import type { CreateObjectiveBodyType, UpdateObjectiveBodyType } from '@shared/schemas/objectives.schemas'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ObjectiveRepository } from '../../repositories/objective.repository'
import type { ManaService } from '../../services/mana.service'
import { ObjectiveService } from '../../services/objective.service'
import { createRepoMock } from '../helpers/mock-repo'

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
      mockObjectiveRepo.create.mockResolvedValue({ id: 'o-1', ...input })

      const result = await objectiveService.create('user-1', input)

      expect(result.objective).toEqual({ id: 'o-1', ...input })
      expect(mockObjectiveRepo.create).toHaveBeenCalledWith('user-1', input)
    })
  })

  describe('getAll', () => {
    it('returns objectives wrapped', async () => {
      mockObjectiveRepo.findAll.mockResolvedValue([{ id: 'o-1' }, { id: 'o-2' }])
      const { objectives } = await objectiveService.getAll('user-1')
      expect(objectives).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('passes id, userId, input to repo', async () => {
      const input = { id: 'o-1', name: 'Renamed' } as unknown as UpdateObjectiveBodyType
      mockObjectiveRepo.update.mockResolvedValue({ id: 'o-1', name: 'Renamed' })

      const result = await objectiveService.update('user-1', input)

      expect(mockObjectiveRepo.update).toHaveBeenCalledWith('o-1', 'user-1', input)
      expect(result.objective).toEqual({ id: 'o-1', name: 'Renamed' })
    })
  })

  describe('complete', () => {
    it('completes objective and grants mana', async () => {
      mockObjectiveRepo.complete.mockResolvedValue({ id: 'o-1', completedAt: new Date() })

      const result = await objectiveService.complete('user-1', 'o-1')

      expect(mockObjectiveRepo.complete).toHaveBeenCalledWith('o-1', 'user-1')
      expect(mockManaService.addManaFromCompletion).toHaveBeenCalledWith('user-1', 'objective')
      expect(result.manaEarned).toBe(MANA_REWARDS.OBJECTIVE)
      expect(result.reserveGained).toBe(0)
    })

    it('returns reserveGained when mana overflows', async () => {
      mockObjectiveRepo.complete.mockResolvedValue({ id: 'o-1' })
      mockManaService.addManaFromCompletion.mockResolvedValue({
        success: true,
        amount: MANA_REWARDS.OBJECTIVE,
        manaApplied: 4,
        reserveGained: 6,
        newMana: 50,
        newReserve: 6
      })

      const result = await objectiveService.complete('user-1', 'o-1')

      expect(result.manaEarned).toBe(4)
      expect(result.reserveGained).toBe(6)
    })
  })

  describe('delete', () => {
    it('delegates to repo', async () => {
      const result = await objectiveService.delete('user-1', 'o-1')
      expect(mockObjectiveRepo.delete).toHaveBeenCalledWith('o-1', 'user-1')
      expect(result.message).toBe('Objective deleted successfully')
    })
  })
})
