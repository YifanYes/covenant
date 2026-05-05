import type { QuestStatus } from '@shared/constants/quests'

export const mockCharacterQuest = (overrides: Record<string, unknown> = {}) => ({
  id: 'quest-instance-1',
  characterId: 'char-123',
  questId: 'patrol_north_gate',
  status: 'ACTIVE' as QuestStatus,
  progress: 0,
  target: 5,
  goldEarned: 0,
  startedAt: new Date('2026-01-01T00:00:00Z'),
  completedAt: null,
  activeDoctrines: {},
  enemyActiveDoctrines: {},
  combatStats: {},
  tacticalState: null,
  ...overrides
})
