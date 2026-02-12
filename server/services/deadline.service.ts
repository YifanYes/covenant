import type { ActivityRepository } from '../repositories/activity.repository'
import type { InvestmentRepository } from '../repositories/investment.repository'
import { logger } from '../lib/logger'

const log = logger.child({ service: 'deadline' })

export interface DeadlineValidationResult {
  activitiesProcessed: number
  activitiesFailed: string[]
  activitiesCompleted: string[]
  investmentsProcessed: number
  investmentsFailed: string[]
  investmentsCompleted: string[]
  timestamp: Date
}

export class DeadlineService {
  constructor(
    private activityRepository: ActivityRepository,
    private investmentRepository: InvestmentRepository
  ) {}

  async validateDeadlines(): Promise<DeadlineValidationResult> {
    const now = new Date()

    const result: DeadlineValidationResult = {
      activitiesProcessed: 0,
      activitiesFailed: [],
      activitiesCompleted: [],
      investmentsProcessed: 0,
      investmentsFailed: [],
      investmentsCompleted: [],
      timestamp: now
    }

    // Process expired activities
    const expiredActivities = await this.activityRepository.findExpiredActivities(now)
    result.activitiesProcessed = expiredActivities.length

    for (const activity of expiredActivities) {
      const isCompleted = activity.progress >= activity.target

      if (isCompleted) {
        await this.activityRepository.completeActivity(activity.id)
        result.activitiesCompleted.push(activity.activityId)
      } else {
        await this.activityRepository.failActivity(activity.id)
        result.activitiesFailed.push(activity.activityId)
      }
    }

    // Process expired investments
    const expiredInvestments = await this.investmentRepository.findExpiredInvestments(now)
    result.investmentsProcessed = expiredInvestments.length

    for (const investment of expiredInvestments) {
      const isCompleted = investment.currentAmount >= investment.targetAmount

      if (isCompleted) {
        // Already handled by contribution logic, but handle edge case
        result.investmentsCompleted.push(investment.investmentId)
      } else {
        await this.investmentRepository.failInvestment(investment.id)
        result.investmentsFailed.push(investment.investmentId)
      }
    }

    log.info({
      activitiesProcessed: result.activitiesProcessed,
      activitiesCompleted: result.activitiesCompleted.length,
      activitiesFailed: result.activitiesFailed.length,
      investmentsProcessed: result.investmentsProcessed,
      investmentsCompleted: result.investmentsCompleted.length,
      investmentsFailed: result.investmentsFailed.length
    }, 'Deadline validation processed')

    return result
  }
}
