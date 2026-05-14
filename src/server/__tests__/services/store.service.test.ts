import { ALL_ITEMS, CONSUMABLES } from '@shared/constants/items'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StoreService } from '../../services/store.services'
import { mockCharacter, mockInventoryItem } from '../fixtures/character.fixtures'

describe('StoreService', () => {
  let storeService: StoreService
  let mockCharacterRepo: any
  let mockCharacterService: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Create mock repository with mocked methods
    mockCharacterRepo = {
      findWithClasses: vi.fn(),
      updateInventoryAndGold: vi.fn()
    }

    // Create mock character service
    mockCharacterService = {
      getCharacterProgress: vi.fn().mockReturnValue({ tier: 1 })
    }

    // Inject the mock dependencies directly
    storeService = new StoreService(mockCharacterRepo, mockCharacterService)
  })

  describe('purchaseItems', () => {
    it('should successfully purchase a valid item', async () => {
      const character = mockCharacter({ gold: 1000 })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 5 }) // High tier to allow purchase

      // Pick a test item with price > 0
      const itemId = Object.keys(ALL_ITEMS).find((id) => ALL_ITEMS[id].price > 0) || Object.keys(ALL_ITEMS)[0]
      const item = ALL_ITEMS[itemId]

      const result = await storeService.purchaseItems('user-123', [itemId])

      expect(result.success).toBe(true)
      expect(result.remainingGold).toBe(1000 - item.price)
      expect(mockCharacterRepo.updateInventoryAndGold).toHaveBeenCalled()
    })

    it('should fail if character does not have enough gold', async () => {
      const character = mockCharacter({ gold: 0 })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 5 })

      const itemId = Object.keys(ALL_ITEMS).find((id) => ALL_ITEMS[id].price > 0) || Object.keys(ALL_ITEMS)[0]

      await expect(storeService.purchaseItems('user-123', [itemId])).rejects.toThrow('Not enough gold')
    })

    it('should fail if item requires higher tier', async () => {
      const character = mockCharacter({ gold: 10000 })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 1 })

      // Find an item with tier > 1
      const highTierItemId = Object.keys(ALL_ITEMS).find((id) => ALL_ITEMS[id].tier > 1) || 'unknown'
      if (highTierItemId === 'unknown') return // Skip if no high tier items

      await expect(storeService.purchaseItems('user-123', [highTierItemId])).rejects.toThrow(/requires Tier/)
    })

    it('should fail if item is already owned (equipment)', async () => {
      const itemId = Object.keys(ALL_ITEMS).find((id) => ALL_ITEMS[id].price > 0) || Object.keys(ALL_ITEMS)[0]
      const ownedItem = mockInventoryItem(itemId)

      const character = mockCharacter({
        gold: 10000,
        inventory: [ownedItem]
      })

      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 5 })

      await expect(storeService.purchaseItems('user-123', [itemId])).rejects.toThrow(/already owned/)
    })

    it('should allow multiple purchases of consumables', async () => {
      const potionId = Object.keys(CONSUMABLES)[0]
      const potion = CONSUMABLES[potionId]

      const character = mockCharacter({ gold: 1000 })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 5 })

      const result = await storeService.purchaseItems('user-123', [potionId, potionId])

      expect(result.success).toBe(true)
      expect(result.remainingGold).toBe(1000 - potion.price * 2)
    })
  })

  describe('listAvailableItems', () => {
    it('should list all available items for the character', async () => {
      const character = mockCharacter()
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 1 })

      const result = await storeService.listAvailableItems('user-123')

      expect(result.items.length).toBeGreaterThan(0)
      expect(result.characterTier).toBe(1)
      expect(result.gold).toBe(100)
    })

    it('should filter out owned equipment', async () => {
      const itemId = Object.keys(ALL_ITEMS)[0]
      const ownedItem = mockInventoryItem(itemId)

      const character = mockCharacter({ inventory: [ownedItem] })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)

      const result = await storeService.listAvailableItems('user-123')

      const listedIds = result.items.map((i) => i.id)
      expect(listedIds).not.toContain(itemId)
    })
  })

  describe('guild-exclusive gating (Phase 3)', () => {
    const exclusiveId = Object.keys(ALL_ITEMS).find((id) => ALL_ITEMS[id].guildExclusive) ?? 'guild_vanguard_blade'

    it('hides guild-exclusive items when user has no guild', async () => {
      const character = mockCharacter({ gold: 10000 })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 5 })

      const guildService = { getMyProgression: vi.fn().mockResolvedValue(null) }
      const gated = new StoreService(mockCharacterRepo, mockCharacterService, guildService as any)

      const result = await gated.listAvailableItems('user-123')
      expect(result.items.map((i) => i.id)).not.toContain(exclusiveId)
    })

    it('hides guild-exclusive items when guild tier is below item tier', async () => {
      const character = mockCharacter({ gold: 10000 })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 5 })
      const itemTier = ALL_ITEMS[exclusiveId].tier

      const guildService = {
        getMyProgression: vi.fn().mockResolvedValue({
          guildId: 'g-1',
          tier: itemTier - 1,
          maxTier: 5,
          totalContribution: 0,
          nextThreshold: 1000,
          goldMultiplier: 1
        })
      }
      const gated = new StoreService(mockCharacterRepo, mockCharacterService, guildService as any)

      const result = await gated.listAvailableItems('user-123')
      expect(result.items.map((i) => i.id)).not.toContain(exclusiveId)
    })

    it('lists guild-exclusive items when guild tier >= item tier', async () => {
      const character = mockCharacter({ gold: 10000 })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 5 })
      const itemTier = ALL_ITEMS[exclusiveId].tier

      const guildService = {
        getMyProgression: vi.fn().mockResolvedValue({
          guildId: 'g-1',
          tier: itemTier,
          maxTier: 5,
          totalContribution: 1000,
          nextThreshold: 5000,
          goldMultiplier: 1.05
        })
      }
      const gated = new StoreService(mockCharacterRepo, mockCharacterService, guildService as any)

      const result = await gated.listAvailableItems('user-123')
      expect(result.items.map((i) => i.id)).toContain(exclusiveId)
    })

    it('purchaseItems rejects guild-exclusive when guild tier too low', async () => {
      const character = mockCharacter({ gold: 10000 })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 5 })
      const itemTier = ALL_ITEMS[exclusiveId].tier

      const guildService = {
        getMyProgression: vi.fn().mockResolvedValue({
          guildId: 'g-1',
          tier: itemTier - 1,
          maxTier: 5,
          totalContribution: 0,
          nextThreshold: 1000,
          goldMultiplier: 1
        })
      }
      const gated = new StoreService(mockCharacterRepo, mockCharacterService, guildService as any)

      await expect(gated.purchaseItems('user-123', [exclusiveId])).rejects.toThrow(/requires a Guild of Tier/)
    })

    it('purchaseItems allows guild-exclusive when guild tier matches', async () => {
      const character = mockCharacter({ gold: 10000 })
      mockCharacterRepo.findWithClasses.mockResolvedValue(character)
      mockCharacterService.getCharacterProgress.mockReturnValue({ tier: 5 })
      const itemTier = ALL_ITEMS[exclusiveId].tier

      const guildService = {
        getMyProgression: vi.fn().mockResolvedValue({
          guildId: 'g-1',
          tier: itemTier,
          maxTier: 5,
          totalContribution: 1000,
          nextThreshold: 5000,
          goldMultiplier: 1.05
        })
      }
      const gated = new StoreService(mockCharacterRepo, mockCharacterService, guildService as any)

      const result = await gated.purchaseItems('user-123', [exclusiveId])
      expect(result.success).toBe(true)
    })
  })
})
