import type { QuestStatus } from '@/shared/constants/quests.constants'

export const mockCharacterQuest = (overrides: Record<string, unknown> = {}) => ({
  id: BigInt(1),
  publicId: 'questpub00001',
  characterId: BigInt(123),
  questId: 'patrol_north_gate',
  status: 'ACTIVE' as QuestStatus,
  progress: 0,
  target: 5,
  goldEarned: 0,
  startedAt: new Date('2026-01-01T00:00:00Z'),
  completedAt: null,
  activeAbilities: {},
  enemyActiveAbilities: {},
  combatStats: {},
  tacticalState: null,
  ...overrides
})
