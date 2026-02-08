import type { MoralityStatus } from '../constants/morality'

export interface MoralityChange {
  previousValue: number
  newValue: number
  previousStatus: MoralityStatus
  newStatus: MoralityStatus
  delta: number
  statusChanged: boolean
}
