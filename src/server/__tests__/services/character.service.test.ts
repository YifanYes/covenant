import { CharacterClassName } from '@shared/constants/classes'
import { ALL_ITEMS } from '@shared/constants/items'
import { getMoralityStatus, clampMorality, MoralityStatus } from '@shared/constants/morality'
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
      findByIdWithClassesOrThrow: vi.fn(),
      getCharacterWithClasses: vi.fn(),
      updateCharacterClass: vi.fn(),
      updateInventoryAndLoadout: vi.fn(),
      updateHealth: vi.fn(),
      updateMorality: vi.fn(),
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

  describe('adjustMorality', () => {
    const withMorality = (morality: number) =>
      mockCharacter({
        classes: [
          {
            id: 'class-1',
            className: CharacterClassName.TEMPLAR,
            tier: 1,
            health: 100,
            mana: 50,
            morality
          }
        ]
      })

    it('should increase morality and return change info', async () => {
      mockCharacterRepo.findByIdWithClassesOrThrow.mockResolvedValue(withMorality(50))

      const result = await characterService.adjustMorality('char-123', 10)

      expect(result.previousValue).toBe(50)
      expect(result.newValue).toBe(60)
      expect(result.delta).toBe(10)
      expect(result.statusChanged).toBe(false)
      expect(mockCharacterRepo.updateMorality).toHaveBeenCalledWith('class-1', 60)
    })

    it('should decrease morality', async () => {
      mockCharacterRepo.findByIdWithClassesOrThrow.mockResolvedValue(withMorality(50))

      const result = await characterService.adjustMorality('char-123', -20)

      expect(result.previousValue).toBe(50)
      expect(result.newValue).toBe(30)
      expect(result.delta).toBe(-20)
      expect(mockCharacterRepo.updateMorality).toHaveBeenCalledWith('class-1', 30)
    })

    it('should clamp at maximum 100', async () => {
      mockCharacterRepo.findByIdWithClassesOrThrow.mockResolvedValue(withMorality(95))

      const result = await characterService.adjustMorality('char-123', 20)

      expect(result.newValue).toBe(100)
      expect(result.delta).toBe(5)
      expect(mockCharacterRepo.updateMorality).toHaveBeenCalledWith('class-1', 100)
    })

    it('should clamp at minimum 0', async () => {
      mockCharacterRepo.findByIdWithClassesOrThrow.mockResolvedValue(withMorality(5))

      const result = await characterService.adjustMorality('char-123', -20)

      expect(result.newValue).toBe(0)
      expect(result.delta).toBe(-5)
      expect(mockCharacterRepo.updateMorality).toHaveBeenCalledWith('class-1', 0)
    })

    it('should detect status change to SAINT', async () => {
      mockCharacterRepo.findByIdWithClassesOrThrow.mockResolvedValue(withMorality(70))

      const result = await characterService.adjustMorality('char-123', 10)

      expect(result.statusChanged).toBe(true)
      expect(result.previousStatus).toBe(MoralityStatus.NEUTRAL)
      expect(result.newStatus).toBe(MoralityStatus.SAINT)
    })

    it('should detect status change to DEMON', async () => {
      mockCharacterRepo.findByIdWithClassesOrThrow.mockResolvedValue(withMorality(30))

      const result = await characterService.adjustMorality('char-123', -10)

      expect(result.statusChanged).toBe(true)
      expect(result.previousStatus).toBe(MoralityStatus.NEUTRAL)
      expect(result.newStatus).toBe(MoralityStatus.DEMON)
    })
  })
})

describe('getMoralityStatus', () => {
  it('should return SAINT for values >= 75', () => {
    expect(getMoralityStatus(75)).toBe(MoralityStatus.SAINT)
    expect(getMoralityStatus(100)).toBe(MoralityStatus.SAINT)
    expect(getMoralityStatus(80)).toBe(MoralityStatus.SAINT)
  })

  it('should return DEMON for values <= 25', () => {
    expect(getMoralityStatus(25)).toBe(MoralityStatus.DEMON)
    expect(getMoralityStatus(0)).toBe(MoralityStatus.DEMON)
    expect(getMoralityStatus(10)).toBe(MoralityStatus.DEMON)
  })

  it('should return NEUTRAL for values between 26 and 74', () => {
    expect(getMoralityStatus(26)).toBe(MoralityStatus.NEUTRAL)
    expect(getMoralityStatus(50)).toBe(MoralityStatus.NEUTRAL)
    expect(getMoralityStatus(74)).toBe(MoralityStatus.NEUTRAL)
  })
})

describe('clampMorality', () => {
  it('should clamp values above 100 to 100', () => {
    expect(clampMorality(150)).toBe(100)
    expect(clampMorality(101)).toBe(100)
  })

  it('should clamp values below 0 to 0', () => {
    expect(clampMorality(-10)).toBe(0)
    expect(clampMorality(-1)).toBe(0)
  })

  it('should not modify values within range', () => {
    expect(clampMorality(0)).toBe(0)
    expect(clampMorality(50)).toBe(50)
    expect(clampMorality(100)).toBe(100)
  })
})
