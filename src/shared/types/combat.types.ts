import type { ResolvedEncounterSlot } from '@shared/constants/encounter-patterns'

export interface EncounterState {
  encounterPattern: ResolvedEncounterSlot[]
  encounterIndex: number
  sessionStartedAt: string
}
