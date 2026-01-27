import { CharacterClassName } from '@shared/constants/classes'
import { ALL_ITEMS } from '@shared/constants/items'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CharacterService } from '../../services/character.service'
import { mockCharacter, mockInventoryItem } from '../fixtures/character.fixtures'

describe('CharacterService', () => {
  let characterService: CharacterService
  let mockCharacterRepo: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock repository with mocked methods
    mockCharacterRepo = {
      findWithClasses: vi.fn(),
      findByUserIdOrThrow: vi.fn(),
      getCharacterWithClasses: vi.fn(),
      updateCharacterClass: vi.fn(),
      updateInventoryAndLoadout: vi.fn(),
      updateHealth: vi.fn(),
      equipItem: vi.fn(),
      unequipItem: vi.fn(),
      updateDoctrines: vi.fn()
    }

    // Inject the mock repository directly
    characterService = new CharacterService(mockCharacterRepo)
  })

  describe('item management', () => {
    it('should equip an item successfully', async () => {
      const itemId = 'inv-item-1'
      const defId = Object.keys(ALL_ITEMS)[0]
      const item = mockInventoryItem(defId, { id: itemId })

      const character = mockCharacter({ inventory: [item] })
      mockCharacterRepo.findByUserIdOrThrow.mockResolvedValue(character)
      mockCharacterRepo.updateInventoryAndLoadout.mockResolvedValue(undefined)

      const result = await characterService.equipItem('user-1', itemId)
      expect(result.success).toBe(true)
      expect(mockCharacterRepo.updateInventoryAndLoadout).toHaveBeenCalled()
    })
  })

  describe('doctrine management', () => {
    it('should equip a doctrine if slots are available', async () => {
      // Mock character with Tier 1 (1 slot) and 0 equipped
      const character = mockCharacter({
        classes: [{ tier: 1, className: CharacterClassName.TEMPLAR }]
      })
      mockCharacterRepo.getCharacterWithClasses.mockResolvedValue(character)
      mockCharacterRepo.updateCharacterClass.mockResolvedValue(undefined)

      const doctrineId = 'truth_blade'

      const result = await characterService.equipDoctrine('user-1', doctrineId)

      expect(result.success).toBe(true)
      expect(result.equippedDoctrines).toContain(doctrineId)
    })

    it('should fail to equip if slots are full', async () => {
      // Mock character with Tier 1 (1 slot) and 1 already equipped
      const existingDoctrine = 'some-doctrine'
      const character = mockCharacter({
        classes: [
          {
            tier: 1,
            className: CharacterClassName.TEMPLAR,
            equippedDoctrines: [existingDoctrine, 'another-one']
          }
        ]
      })
      mockCharacterRepo.getCharacterWithClasses.mockResolvedValue(character)

      const doctrineId = 'truth_blade'

      await expect(characterService.equipDoctrine('user-1', doctrineId)).rejects.toThrow(/Maximum.*reached/)
    })
  })
})
