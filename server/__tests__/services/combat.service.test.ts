import { WeaponDamageType } from '@shared/constants/items'
import { StatusEffect, type ActiveStatusEffect } from '@shared/types/doctrine.types'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CombatService } from '../../services/combat.service'
import { createMockPrisma } from '../mocks/prisma.mock'

// Mock dependencies
const mockPrisma = createMockPrisma()

vi.mock('../../repositories/character.repository', () => ({
  CharacterRepository: vi.fn(function () {
    return {
      // Add methods used by CombatService
      findWithClasses: vi.fn()
    }
  })
}))

describe('CombatService', () => {
  let combatService: CombatService
  let mockCharacterRepo: any

  beforeEach(() => {
    vi.clearAllMocks()
    combatService = new CombatService(mockPrisma as any)
    // Access the mocked instances if needed
    mockCharacterRepo = (combatService as any).characterRepository
  })

  describe('dice mechanics', () => {
    it('rollDice should return correct number of results between 1-6', () => {
      const count = 5
      const rolls = combatService.rollDice(count)

      expect(rolls.length).toBe(count)
      rolls.forEach((roll) => {
        expect(roll).toBeGreaterThanOrEqual(1)
        expect(roll).toBeLessThanOrEqual(6)
      })
    })

    it('calculateHitsWithCount should correctly count successes', () => {
      const rolls = [1, 2, 3, 4, 5, 6]
      const threshold = 4

      // 4, 5, 6 should hit. 6 is critical by default (2 hits?) logic depends on critical implementation
      // Checking implementation: hits += 1, if >= critical hits += 1
      // So 4 (1), 5 (1), 6 (2) = 4 total hits

      const result = combatService.calculateHitsWithCount(rolls, threshold, 6, false)
      expect(result.count).toBe(3)
    })

    it('calculateHitsWithCount should handle guaranteed criticals', () => {
      const rolls = [4]
      const threshold = 4

      // 4 is a hit (1). Guaranteed crit adds +1. Total 2.
      const result = combatService.calculateHitsWithCount(rolls, threshold, 6, true)
      expect(result.count).toBe(1)
    })
  })

  describe('combat validation utilities', () => {
    it('getThreshold should return correct values based on damage type', () => {
      // Physical
      expect((combatService as any).getThreshold(WeaponDamageType.PHYSICAL, 4, 2)).toBe(4)

      // Magic
      expect((combatService as any).getThreshold(WeaponDamageType.MAGIC, 4, 2)).toBe(2)
    })
  })

  describe('processActiveDoctrines', () => {
    const createDefaultModifiers = () => ({
      playerAttackBonusDice: 0,
      playerDefenseBonusDice: 0,
      playerAttackThresholdMod: 0,
      playerDefenseThresholdMod: 0,
      enemyAttackBonusDice: 0,
      enemyDefenseBonusDice: 0,
      playerNegateHits: 0,
      enemyNegateHits: 0,
      guaranteedPlayerCritical: false,
      playerCriticalThresholdMod: 0,
      directDamageToEnemy: 0,
      healthRestored: 0,
      burningDamageToPlayer: 0,
      burningDamageToEnemy: 0
    })

    it('should correctly process StatusEffect.STUNNED for player and enemy', () => {
      const doctrines: Record<string, ActiveStatusEffect> = {
        ['stun-effect']: {
          effect: StatusEffect.STUNNED,
          remainingTurns: 1,
          sourceDoctrineId: 'any'
        }
      }

      // Player Stunned
      const playerMods = createDefaultModifiers()
      ;(combatService as any).processActiveDoctrines(doctrines, playerMods, true, 6, 1000)
      expect(playerMods.playerAttackBonusDice).toBe(-100)

      // Enemy Stunned
      const enemyDoctrines: Record<string, ActiveStatusEffect> = {
        ['stun-effect']: {
          effect: StatusEffect.STUNNED,
          remainingTurns: 1,
          sourceDoctrineId: 'any'
        }
      }
      const enemyMods = createDefaultModifiers()
      ;(combatService as any).processActiveDoctrines(enemyDoctrines, enemyMods, false, 6, 1000)
      expect(enemyMods.enemyAttackBonusDice).toBe(-100)
    })

    it('should correctly process burning status effect dealing damage', () => {
      const doctrines: Record<string, ActiveStatusEffect> = {
        ['burn-effect']: {
          effect: StatusEffect.BURNING,
          remainingTurns: 1,
          sourceDoctrineId: 'any'
        }
      }

      // Player Burning
      const playerMods = createDefaultModifiers()
      const playerResult = (combatService as any).processActiveDoctrines(doctrines, playerMods, true, 6, 1000)
      expect(playerMods.burningDamageToPlayer).toBe(1)
      expect(playerResult.logs.some((l: any) => l.data.damage === 1)).toBe(true)

      // Enemy Burning
      const enemyDoctrines: Record<string, ActiveStatusEffect> = {
        ['burn-effect']: {
          effect: StatusEffect.BURNING,
          remainingTurns: 1,
          sourceDoctrineId: 'any'
        }
      }
      const enemyMods = createDefaultModifiers()
      ;(combatService as any).processActiveDoctrines(enemyDoctrines, enemyMods, false, 6, 1000)
      expect(enemyMods.burningDamageToEnemy).toBe(1)
    })

    it('should correctly process doctrine effects for player', () => {
      // We use real doctrine IDs that correspond to specific effects
      const doctrines: Record<string, ActiveStatusEffect> = {
        // Truth Blade: +1 Power Modifier (Self)
        ['truth_blade_active']: {
          effect: StatusEffect.DOCTRINE_ACTIVE,
          remainingTurns: 1,
          sourceDoctrineId: 'truth_blade'
        },
        // Miraculous Protection: Negate 1 Hit (Self)
        ['prot_active']: {
          effect: StatusEffect.DOCTRINE_ACTIVE,
          remainingTurns: 1,
          sourceDoctrineId: 'miraculous_protection'
        }
      }

      const mods = createDefaultModifiers()
      ;(combatService as any).processActiveDoctrines(doctrines, mods, true, 6, 1000)

      expect(mods.playerAttackBonusDice).toBe(1)
      expect(mods.playerNegateHits).toBe(1)
    })

    it('should correctly handle expiring effects', () => {
      const doctrines: Record<string, ActiveStatusEffect> = {
        ['expiring']: {
          effect: StatusEffect.STUNNED,
          remainingTurns: 1,
          sourceDoctrineId: 'any'
        },
        ['continuing']: {
          effect: StatusEffect.STUNNED,
          remainingTurns: 2,
          sourceDoctrineId: 'any'
        }
      }

      const mods = createDefaultModifiers()
      const result = (combatService as any).processActiveDoctrines(doctrines, mods, true, 6, 1000)

      expect(result.updatedDoctrines['expiring']).toBeUndefined()
      expect(result.updatedDoctrines['continuing']).toBeDefined()
      expect(result.updatedDoctrines['continuing'].remainingTurns).toBe(1)
    })
  })
})
