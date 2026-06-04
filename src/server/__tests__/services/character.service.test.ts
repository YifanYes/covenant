import { CharacterClassName } from '@/shared/constants/classes.constants'
import { ALL_ITEMS, TIER_1_ITEMS } from '@/shared/constants/items.constants'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CharacterRepository } from '../../repositories/character.repository'
import type { UserRepository } from '../../repositories/user.repository'
import { CharacterService } from '../../services/character.service'
import { mockCharacter, mockInventoryItem } from '../fixtures/character.fixtures'
import { createRepoMock } from '../helpers/mock-repo'

describe('CharacterService', () => {
  let characterService: CharacterService
  let mockCharacterRepo: ReturnType<typeof createRepoMock<CharacterRepository>>
  let mockUserRepo: ReturnType<typeof createRepoMock<UserRepository>>

  beforeEach(() => {
    vi.clearAllMocks()

    mockCharacterRepo = createRepoMock<CharacterRepository>()
    mockUserRepo = createRepoMock<UserRepository>()

    characterService = new CharacterService(mockCharacterRepo, mockUserRepo)
  })

  describe('tutorial', () => {
    it('markTutorialSlideSeen appends to user.tutorialSlidesSeen idempotently', async () => {
      mockUserRepo.getTutorialSlidesSeen.mockResolvedValue([])
      mockUserRepo.setTutorialSlidesSeen.mockResolvedValue({} as never)

      const first = await characterService.markTutorialSlideSeen('user-1', 'mana')
      expect(mockUserRepo.setTutorialSlidesSeen).toHaveBeenCalledWith('user-1', ['mana'])
      expect(first.tutorialSlidesSeen).toEqual(['mana'])

      mockUserRepo.getTutorialSlidesSeen.mockResolvedValue(['mana'])
      const second = await characterService.markTutorialSlideSeen('user-1', 'mana')
      expect(mockUserRepo.setTutorialSlidesSeen).toHaveBeenCalledTimes(1)
      expect(second.tutorialSlidesSeen).toEqual(['mana'])
    })

    it('resetTutorialSlides clears user.tutorialSlidesSeen', async () => {
      mockUserRepo.setTutorialSlidesSeen.mockResolvedValue({} as never)

      const result = await characterService.resetTutorialSlides('user-1')

      expect(mockUserRepo.setTutorialSlidesSeen).toHaveBeenCalledWith('user-1', [])
      expect(result.tutorialSlidesSeen).toEqual([])
    })

    it('getCurrentClass exposes tutorialSlidesSeen and onboardingProgress', async () => {
      const character = {
        ...mockCharacter(),
        factionName: 'HOLY_KNIGHTS',
        title: null,
        magicNature: null,
        onboardingProgress: { habitCreated: true },
        user: { tutorialSlidesSeen: ['mana'] }
      }
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)

      const result = await characterService.getCurrentClass('user-1')

      expect(result?.tutorialSlidesSeen).toEqual(['mana'])
      expect(result?.onboardingProgress).toEqual({ habitCreated: true })
    })

    it('getCurrentClass persists missing tier 1 inventory items', async () => {
      const character = {
        ...mockCharacter(),
        factionName: 'HOLY_KNIGHTS',
        title: null,
        magicNature: null,
        user: { tutorialSlidesSeen: [] }
      }
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterRepo.updateInventoryAndLoadout.mockResolvedValue(undefined)

      const result = await characterService.getCurrentClass('user-1')

      expect(mockCharacterRepo.updateInventoryAndLoadout).toHaveBeenCalledWith(
        character.id,
        expect.arrayContaining(
          Object.keys(TIER_1_ITEMS).map((definitionId) => expect.objectContaining({ id: definitionId, definitionId }))
        ),
        []
      )
      expect(result?.inventory).toHaveLength(Object.keys(TIER_1_ITEMS).length)
    })
  })

  describe('onboarding progress', () => {
    it('updateOnboardingProgress merges patch via repo', async () => {
      mockCharacterRepo.updateOnboardingProgress.mockResolvedValue(undefined)

      await characterService.updateOnboardingProgress('user-1', { habitCreated: true })

      expect(mockCharacterRepo.updateOnboardingProgress).toHaveBeenCalledWith('user-1', { habitCreated: true })
    })

    it('dismissOnboarding writes dismissedAt ISO string', async () => {
      mockCharacterRepo.updateOnboardingProgress.mockResolvedValue(undefined)

      await characterService.dismissOnboarding('user-1')

      expect(mockCharacterRepo.updateOnboardingProgress).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ dismissedAt: expect.any(String) })
      )
    })
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

  describe('ability management', () => {
    it('should equip a ability if slots are available', async () => {
      // Mock character with Tier 1 (1 slot) and 0 equipped
      const character = mockCharacter({
        classes: [{ tier: 1, className: CharacterClassName.TEMPLAR }]
      })
      mockCharacterRepo.getCharacterWithClasses.mockResolvedValue(character)
      mockCharacterRepo.updateCharacterClass.mockResolvedValue(undefined)

      const abilityId = 'truth_blade'

      const result = await characterService.equipAbility('user-1', abilityId)

      expect(result.success).toBe(true)
      expect(result.equippedAbilities).toContain(abilityId)
    })

    it('should fail to equip if slots are full', async () => {
      // Mock character with Tier 1 (1 slot) and 1 already equipped
      const existingAbility = 'some-ability'
      const character = mockCharacter({
        classes: [
          {
            tier: 1,
            className: CharacterClassName.TEMPLAR,
            equippedAbilities: [existingAbility, 'another-one']
          }
        ]
      })
      mockCharacterRepo.getCharacterWithClasses.mockResolvedValue(character)

      const abilityId = 'truth_blade'

      await expect(characterService.equipAbility('user-1', abilityId)).rejects.toThrow(/Maximum.*reached/)
    })
  })
})
