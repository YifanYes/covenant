import type { ActivityRepository } from '../repositories/activity.repository'
import { logger } from '../lib/logger'

const log = logger.child({ service: 'deadline' })

export interface DeadlineValidationResult {
  activitiesProcessed: number
  activitiesFailed: string[]
  activitiesCompleted: string[]
  timestamp: Date
}

export class DeadlineService {
  constructor(
    private activityRepository: ActivityRepository
  ) {}

  async validateDeadlines(): Promise<DeadlineValidationResult> {
    const now = new Date()

    const result: DeadlineValidationResult = {
      activitiesProcessed: 0,
      activitiesFailed: [],
      activitiesCompleted: [],
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

    log.info({
      activitiesProcessed: result.activitiesProcessed,
      activitiesCompleted: result.activitiesCompleted.length,
      activitiesFailed: result.activitiesFailed.length
    }, 'Deadline validation processed')

    return result
  }
}
