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
  let tx: { character: TxRepo; user: TxRepo }

  beforeEach(() => {
    vi.clearAllMocks()

    tx = {
      character: createRepoMock<any>(),
      user: createRepoMock<any>()
    }

    mockPrisma = createPrismaMock(tx)

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
    it('updates user theme via userRepo', async () => {
      const result = await authService.updateTheme('user-1', { theme: 'dark' } as unknown as UpdateThemeType)
      expect(mockUserRepo.update).toHaveBeenCalledWith('user-1', { theme: 'dark' })
      expect(result.message).toBe('Theme updated successfully')
    })
  })

  describe('updateProfile', () => {
    it('updates user fields only when no characterName', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1', name: 'New' })

      const result = await authService.updateProfile('user-1', { name: 'New' } as unknown as UpdateProfileType)

      expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { name: 'New' } })
      expect(tx.character.update).not.toHaveBeenCalled()
      expect(result).toEqual({ id: 'user-1', name: 'New' })
    })

    it('updates character name only when no user fields', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1' })

      await authService.updateProfile('user-1', { characterName: 'Hero' } as unknown as UpdateProfileType)

      expect(tx.user.update).not.toHaveBeenCalled()
      expect(tx.character.update).toHaveBeenCalledWith({ where: { userId: 'user-1' }, data: { name: 'Hero' } })
    })

    it('updates both user fields and character name', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1' })

      await authService.updateProfile('user-1', {
        name: 'New',
        characterName: 'Hero'
      } as unknown as UpdateProfileType)

      expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { name: 'New' } })
      expect(tx.character.update).toHaveBeenCalledWith({ where: { userId: 'user-1' }, data: { name: 'Hero' } })
    })

    it('skips both updates when input only has characterName: undefined', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1' })

      await authService.updateProfile('user-1', {
        characterName: undefined
      } as unknown as UpdateProfileType)

      expect(tx.user.update).not.toHaveBeenCalled()
      expect(tx.character.update).not.toHaveBeenCalled()
    })

    it('returns userRepo.findById result after transaction', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1', name: 'Resolved' })
      const result = await authService.updateProfile('user-1', { name: 'X' } as unknown as UpdateProfileType)
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-1')
      expect(result).toEqual({ id: 'user-1', name: 'Resolved' })
    })
  })

  describe('getProfile', () => {
    it('delegates to userRepo.findById', async () => {
      mockUserRepo.findById.mockResolvedValue({ id: 'user-1' })
      const result = await authService.getProfile('user-1')
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-1')
      expect(result).toEqual({ id: 'user-1' })
    })
  })
})
