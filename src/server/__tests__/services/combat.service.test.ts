import { ItemType } from '@shared/types/gamification.types'
import {
  PLAYER_TEMPLATE_ID,
  TACTICAL_STATE_VERSION,
  type TacticalStateData,
  type TileState
} from '@shared/types/tactical-combat.types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CombatService } from '../../services/combat.service'

const createMockCharacter = (
  health: number,
  maxHealth: number,
  mana: number,
  maxMana: number,
  inventory: unknown[] = []
) => ({
  id: 'char-1',
  name: 'Test Character',
  currentClass: 'knight',
  data: {},
  manaReserve: 0,
  inventory,
  loadout: [],
  classes: [
    {
      id: 'class-1',
      className: 'knight',
      health,
      maxHealth,
      mana,
      maxMana,
      tier: 1,
      strengthAtk: 5,
      strengthDef: 5,
      magicAtk: 5,
      magicDef: 5,
      speed: 1,
      manaRegen: 0,
      equippedAbilities: []
    }
  ]
})

const createTacticalStateForConsumable = (playerHealth: number, maxHealth: number): TacticalStateData => {
  const tiles: TileState[][] = []
  return {
    stateVersion: TACTICAL_STATE_VERSION,
    mapTemplateId: 'test-map',
    gridWidth: 1,
    gridHeight: 1,
    tiles,
    units: [
      {
        id: 'player-1',
        templateId: PLAYER_TEMPLATE_ID,
        name: 'Player',
        hasMoved: false,
        hasActed: false,
        currentHealth: playerHealth,
        maxHealth,
        currentMana: 0,
        maxMana: 0,
        speed: 1,
        strengthAtk: 5,
        strengthDef: 5,
        magicAtk: 5,
        magicDef: 5
      }
    ],
    turnOrder: ['player-1'],
    currentTurnIndex: 0,
    turnNumber: 1
  }
}

describe('CombatService (Phase 2A)', () => {
  let combatService: CombatService
  let mockCharacterRepo: any
  let mockCharacterQuestRepo: any
  let mockCharacterService: any

  beforeEach(() => {
    vi.clearAllMocks()

    mockCharacterRepo = {
      findWithClasses: vi.fn(),
      findWithClassesOrThrow: vi.fn(),
      findByIdWithClasses: vi.fn(),
      updateHealth: vi.fn(),
      updateInventoryAndLoadout: vi.fn(),
      updateManaReserve: vi.fn()
    }

    mockCharacterQuestRepo = {
      findActiveByCharacterId: vi.fn(),
      findByIdWithTacticalState: vi.fn(),
      verifyOwnership: vi.fn().mockResolvedValue(true),
      updateTacticalState: vi.fn()
    }

    mockCharacterService = {
      getCurrentClass: vi.fn(),
      updateHealth: vi.fn(),
      getCharacterById: vi.fn()
    }

    combatService = new CombatService(mockCharacterRepo, mockCharacterQuestRepo, mockCharacterService)
  })

  describe('useConsumable (health_potion)', () => {
    it('restores health and removes the consumable when used outside combat', async () => {
      const inventory = [{ id: 'item-1', type: ItemType.CONSUMABLE, definitionId: 'health_potion' }]
      mockCharacterRepo.findWithClassesOrThrow.mockResolvedValue(createMockCharacter(20, 50, 5, 10, inventory))
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)

      const result = await combatService.useConsumable('user-1', 'health_potion')

      expect(result.success).toBe(true)
      // health_potion now restores 15 HP (Phase 2A: HP×5 means heal also scales ×5)
      expect(result.healthRestored).toBe(15)
      expect(mockCharacterRepo.updateHealth).toHaveBeenCalledWith('class-1', 35, 5)
      expect(mockCharacterRepo.updateInventoryAndLoadout).toHaveBeenCalled()
    })

    it('caps health restoration at max health', async () => {
      const inventory = [{ id: 'item-1', type: ItemType.CONSUMABLE, definitionId: 'health_potion' }]
      mockCharacterRepo.findWithClassesOrThrow.mockResolvedValue(createMockCharacter(45, 50, 5, 10, inventory))
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue(null)

      const result = await combatService.useConsumable('user-1', 'health_potion')

      expect(result.success).toBe(true)
      // Only 5 HP missing → only 5 restored
      expect(result.healthRestored).toBe(5)
      expect(mockCharacterRepo.updateHealth).toHaveBeenCalledWith('class-1', 50, 5)
    })

    it('throws if consumable not in inventory', async () => {
      mockCharacterRepo.findWithClassesOrThrow.mockResolvedValue(createMockCharacter(20, 50, 5, 10, []))
      await expect(combatService.useConsumable('user-1', 'health_potion')).rejects.toThrow('not in inventory')
    })

    it('throws if consumable definition does not exist', async () => {
      await expect(combatService.useConsumable('user-1', 'invalid_potion')).rejects.toThrow('not found')
    })

    it('blocks a second potion in the same turn when markPotionTurn is set', async () => {
      const inventory = [{ id: 'item-1', type: ItemType.CONSUMABLE, definitionId: 'health_potion' }]
      mockCharacterRepo.findWithClassesOrThrow.mockResolvedValue(createMockCharacter(20, 50, 5, 10, inventory))
      mockCharacterQuestRepo.findActiveByCharacterId.mockResolvedValue({
        id: 'quest-1',
        tacticalState: { ...createTacticalStateForConsumable(20, 50), potionUsedThisTurn: true }
      })

      await expect(combatService.useConsumable('user-1', 'health_potion', { markPotionTurn: true })).rejects.toThrow(
        'Already used a potion this turn'
      )
    })
  })

  describe('player entry points (validation)', () => {
    it('playerExecuteMove throws NOT_FOUND if user does not own the quest', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(false)
      await expect(
        combatService.playerExecuteMove('user-1', 'quest-1', 'player-1', 'basic_strike', ['enemy-1'])
      ).rejects.toThrow('Resource not found or access denied')
    })

    it('playerExecuteMove throws FORBIDDEN if casterId is not a player unit', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(true)
      await expect(
        combatService.playerExecuteMove('user-1', 'quest-1', 'enemy-1', 'basic_strike', ['enemy-2'])
      ).rejects.toThrow('Cannot execute move for enemy units')
    })

    it('playerEnemyTurn throws NOT_FOUND if user does not own the quest', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(false)
      await expect(combatService.playerEnemyTurn('user-1', 'quest-1', 'enemy-1')).rejects.toThrow(
        'Resource not found or access denied'
      )
    })

    it('playerEnemyTurn throws BAD_REQUEST if enemyId is a player unit', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(true)
      await expect(combatService.playerEnemyTurn('user-1', 'quest-1', 'player-1')).rejects.toThrow(
        'Cannot execute AI turn for player units'
      )
    })

    it('playerUsePotion throws NOT_FOUND if user does not own the quest', async () => {
      mockCharacterQuestRepo.verifyOwnership.mockResolvedValue(false)
      await expect(combatService.playerUsePotion('user-1', 'quest-1', 'health_potion')).rejects.toThrow(
        'Resource not found or access denied'
      )
    })
  })
})
