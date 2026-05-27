/* eslint-disable @typescript-eslint/no-explicit-any -- TODO: replace tx-model `any` with PrismaClient delegate types */
import type { UpdateProfileType, UpdateThemeType } from '@shared/schemas/auth.schemas'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { UserRepository } from '../../repositories/user.repository'
import { AuthService } from '../../services/auth.service'
import { createPrismaMock, createRepoMock } from '../helpers/mock-repo'

describe('AuthService', () => {
  type TxRepo = ReturnType<typeof createRepoMock<any>>

  let authService: AuthService
  let mockPrisma: ReturnType<typeof createPrismaMock>
  let mockUserRepo: ReturnType<typeof createRepoMock<UserRepository>>
  let tx: { character: TxRepo; userSettings: TxRepo }

  beforeEach(() => {
    vi.clearAllMocks()

    tx = {
      character: createRepoMock<any>(),
      userSettings: createRepoMock<any>()
    }

    mockPrisma = createPrismaMock(tx)
    // top-level userSettings used by updateTheme + getProfile safety net
    ;(mockPrisma as any).userSettings = createRepoMock<any>()

    mockUserRepo = createRepoMock<UserRepository>()

    authService = new AuthService(mockPrisma, mockUserRepo)
  })

  describe('deleteAccount', () => {
    it('delegates to userRepository.delete (schema cascade handles child rows)', async () => {
      const result = await authService.deleteAccount('user-1')

      expect(mockUserRepo.delete).toHaveBeenCalledWith('user-1')
      expect(result.message).toBe('Account deleted successfully')
    })

    it('propagates userRepository.delete rejection so caller sees the failure', async () => {
      const dbError = new Error('FK violation')
      mockUserRepo.delete.mockRejectedValue(dbError)

      await expect(authService.deleteAccount('user-1')).rejects.toThrow(dbError)
    })
  })

  describe('updateTheme', () => {
    it('upserts user theme via userSettings', async () => {
      const result = await authService.updateTheme('user-1', { theme: 'HOLY_KNIGHTS' } as UpdateThemeType)
      expect((mockPrisma as any).userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { theme: 'HOLY_KNIGHTS' },
        create: { userId: 'user-1', theme: 'HOLY_KNIGHTS' }
      })
      expect(result.message).toBe('Theme updated successfully')
    })
  })

  describe('updateProfile', () => {
    it('upserts userSettings when only settings fields provided', async () => {
      mockUserRepo.findById.mockResolvedValue({
        id: 'user-1',
        userSettings: { theme: 'HOLY_KNIGHTS' }
      })

      const result = await authService.updateProfile('user-1', { theme: 'HOLY_KNIGHTS' } as UpdateProfileType)

      expect(tx.userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        update: { theme: 'HOLY_KNIGHTS' },
        create: { userId: 'user-1', theme: 'HOLY_KNIGHTS' }
      })
      expect(tx.character.update).not.toHaveBeenCalled()
      expect(result).toEqual({ id: 'user-1', userSettings: { theme: 'HOLY_KNIGHTS' } })
    })

    it('updates character name only when no settings fields', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1', userSettings: {} })

      await authService.updateProfile('user-1', { characterName: 'Hero' } as UpdateProfileType)

      expect(tx.userSettings.upsert).not.toHaveBeenCalled()
      expect(tx.character.update).toHaveBeenCalledWith({ where: { userId: 'user-1' }, data: { name: 'Hero' } })
    })

    it('updates both settings and character name', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1', userSettings: {} })

      await authService.updateProfile('user-1', {
        theme: 'HOLY_KNIGHTS',
        characterName: 'Hero'
      } as UpdateProfileType)

      expect(tx.userSettings.upsert).toHaveBeenCalled()
      expect(tx.character.update).toHaveBeenCalledWith({ where: { userId: 'user-1' }, data: { name: 'Hero' } })
    })

    it('skips both updates when input only has characterName: undefined', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1', userSettings: {} })

      await authService.updateProfile('user-1', {
        characterName: undefined
      } as UpdateProfileType)

      expect(tx.userSettings.upsert).not.toHaveBeenCalled()
      expect(tx.character.update).not.toHaveBeenCalled()
    })

    it('rejects when all four tab booleans are false', async () => {
      await expect(
        authService.updateProfile('user-1', {
          showListTab: false,
          showKanbanTab: false,
          showTableTab: false,
          showMatrixTab: false
        } as UpdateProfileType)
      ).rejects.toThrow('tasks.settings.at_least_one_visible')
    })
  })

  describe('getProfile', () => {
    it('returns profile when userSettings already exists', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1', userSettings: { theme: 'HOLY_KNIGHTS' } })
      const result = await authService.getProfile('user-1')
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-1')
      expect(result).toEqual({ id: 'user-1', userSettings: { theme: 'HOLY_KNIGHTS' } })
    })

    it('upserts userSettings row when missing', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1', userSettings: null })
      ;(mockPrisma as any).userSettings.upsert.mockResolvedValue({ theme: 'HOLY_KNIGHTS' })
      const result = await authService.getProfile('user-1')
      expect((mockPrisma as any).userSettings.upsert).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        create: { userId: 'user-1' },
        update: {}
      })
      expect(result).toEqual({ id: 'user-1', userSettings: { theme: 'HOLY_KNIGHTS' } })
    })
  })
})
