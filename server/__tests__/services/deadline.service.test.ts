import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DeadlineService } from '../../services/deadline.service'

describe('DeadlineService', () => {
  let deadlineService: DeadlineService
  let mockActivityRepo: any
  let mockInvestmentRepo: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockActivityRepo = {
      findExpiredActivities: vi.fn(),
      completeActivity: vi.fn(),
      failActivity: vi.fn()
    }

    mockInvestmentRepo = {
      findExpiredInvestments: vi.fn(),
      failInvestment: vi.fn()
    }

    deadlineService = new DeadlineService(mockActivityRepo, mockInvestmentRepo)
  })

  describe('validateDeadlines', () => {
    it('should return empty result when no expired activities or investments', async () => {
      mockActivityRepo.findExpiredActivities.mockResolvedValue([])
      mockInvestmentRepo.findExpiredInvestments.mockResolvedValue([])

      const result = await deadlineService.validateDeadlines()

      expect(result.activitiesProcessed).toBe(0)
      expect(result.activitiesFailed).toEqual([])
      expect(result.activitiesCompleted).toEqual([])
      expect(result.investmentsProcessed).toBe(0)
      expect(result.investmentsFailed).toEqual([])
      expect(result.investmentsCompleted).toEqual([])
      expect(result.timestamp).toBeInstanceOf(Date)
    })

    it('should complete activities that met their target', async () => {
      const expiredActivity = {
        id: 'activity-db-id-1',
        activityId: 'santa_cruz_siege',
        progress: 100,
        target: 50,
        deadline: new Date('2024-01-01')
      }

      mockActivityRepo.findExpiredActivities.mockResolvedValue([expiredActivity])
      mockActivityRepo.completeActivity.mockResolvedValue({})
      mockInvestmentRepo.findExpiredInvestments.mockResolvedValue([])

      const result = await deadlineService.validateDeadlines()

      expect(result.activitiesProcessed).toBe(1)
      expect(result.activitiesCompleted).toEqual(['santa_cruz_siege'])
      expect(result.activitiesFailed).toEqual([])
      expect(mockActivityRepo.completeActivity).toHaveBeenCalledWith('activity-db-id-1')
      expect(mockActivityRepo.failActivity).not.toHaveBeenCalled()
    })

    it('should fail activities that did not meet their target', async () => {
      const expiredActivity = {
        id: 'activity-db-id-2',
        activityId: 'demon_invasion',
        progress: 30,
        target: 100,
        deadline: new Date('2024-01-01')
      }

      mockActivityRepo.findExpiredActivities.mockResolvedValue([expiredActivity])
      mockActivityRepo.failActivity.mockResolvedValue({})
      mockInvestmentRepo.findExpiredInvestments.mockResolvedValue([])

      const result = await deadlineService.validateDeadlines()

      expect(result.activitiesProcessed).toBe(1)
      expect(result.activitiesFailed).toEqual(['demon_invasion'])
      expect(result.activitiesCompleted).toEqual([])
      expect(mockActivityRepo.failActivity).toHaveBeenCalledWith('activity-db-id-2')
      expect(mockActivityRepo.completeActivity).not.toHaveBeenCalled()
    })

    it('should fail investments that did not meet their target', async () => {
      const expiredInvestment = {
        id: 'investment-db-id-1',
        investmentId: 'anti_demon_barrier',
        currentAmount: 500,
        targetAmount: 1000,
        deadline: new Date('2024-01-01')
      }

      mockActivityRepo.findExpiredActivities.mockResolvedValue([])
      mockInvestmentRepo.findExpiredInvestments.mockResolvedValue([expiredInvestment])
      mockInvestmentRepo.failInvestment.mockResolvedValue({})

      const result = await deadlineService.validateDeadlines()

      expect(result.investmentsProcessed).toBe(1)
      expect(result.investmentsFailed).toEqual(['anti_demon_barrier'])
      expect(result.investmentsCompleted).toEqual([])
      expect(mockInvestmentRepo.failInvestment).toHaveBeenCalledWith('investment-db-id-1')
    })

    it('should mark investments as completed if they met target at deadline', async () => {
      const expiredInvestment = {
        id: 'investment-db-id-2',
        investmentId: 'providence_purification',
        currentAmount: 1500,
        targetAmount: 1000,
        deadline: new Date('2024-01-01')
      }

      mockActivityRepo.findExpiredActivities.mockResolvedValue([])
      mockInvestmentRepo.findExpiredInvestments.mockResolvedValue([expiredInvestment])

      const result = await deadlineService.validateDeadlines()

      expect(result.investmentsProcessed).toBe(1)
      expect(result.investmentsCompleted).toEqual(['providence_purification'])
      expect(result.investmentsFailed).toEqual([])
      expect(mockInvestmentRepo.failInvestment).not.toHaveBeenCalled()
    })

    it('should process multiple activities and investments', async () => {
      const expiredActivities = [
        { id: 'a1', activityId: 'activity_1', progress: 100, target: 50 },
        { id: 'a2', activityId: 'activity_2', progress: 20, target: 100 },
        { id: 'a3', activityId: 'activity_3', progress: 50, target: 50 }
      ]

      const expiredInvestments = [
        { id: 'i1', investmentId: 'investment_1', currentAmount: 100, targetAmount: 500 },
        { id: 'i2', investmentId: 'investment_2', currentAmount: 1000, targetAmount: 500 }
      ]

      mockActivityRepo.findExpiredActivities.mockResolvedValue(expiredActivities)
      mockActivityRepo.completeActivity.mockResolvedValue({})
      mockActivityRepo.failActivity.mockResolvedValue({})
      mockInvestmentRepo.findExpiredInvestments.mockResolvedValue(expiredInvestments)
      mockInvestmentRepo.failInvestment.mockResolvedValue({})

      const result = await deadlineService.validateDeadlines()

      expect(result.activitiesProcessed).toBe(3)
      expect(result.activitiesCompleted).toEqual(['activity_1', 'activity_3'])
      expect(result.activitiesFailed).toEqual(['activity_2'])
      expect(result.investmentsProcessed).toBe(2)
      expect(result.investmentsFailed).toEqual(['investment_1'])
      expect(result.investmentsCompleted).toEqual(['investment_2'])

      expect(mockActivityRepo.completeActivity).toHaveBeenCalledTimes(2)
      expect(mockActivityRepo.failActivity).toHaveBeenCalledTimes(1)
      expect(mockInvestmentRepo.failInvestment).toHaveBeenCalledTimes(1)
    })

    it('should handle activity at exactly the target threshold', async () => {
      const expiredActivity = {
        id: 'activity-exact',
        activityId: 'exact_target',
        progress: 100,
        target: 100,
        deadline: new Date('2024-01-01')
      }

      mockActivityRepo.findExpiredActivities.mockResolvedValue([expiredActivity])
      mockActivityRepo.completeActivity.mockResolvedValue({})
      mockInvestmentRepo.findExpiredInvestments.mockResolvedValue([])

      const result = await deadlineService.validateDeadlines()

      expect(result.activitiesCompleted).toEqual(['exact_target'])
      expect(mockActivityRepo.completeActivity).toHaveBeenCalledWith('activity-exact')
    })
  })
})
