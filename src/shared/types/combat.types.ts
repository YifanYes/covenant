import type { ResolvedEncounterSlot } from '@/shared/constants/encounter-patterns.constants'

export interface EncounterState {
  encounterPattern: ResolvedEncounterSlot[]
  encounterIndex: number
  sessionStartedAt: string
}
