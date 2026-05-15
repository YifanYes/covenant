import type { PrismaClient } from '@/generated/prisma'
import type { UpdateProfileType, UpdateThemeType } from '@shared/schemas/auth.schemas'
import type { UserRepository } from '../repositories/user.repository'

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private userRepository: UserRepository
  ) {}

  async deleteAccount(userId: string) {
    await this.userRepository.delete(userId)
    return { message: 'Account deleted successfully' }
  }

  async updateTheme(userId: string, input: UpdateThemeType) {
    await this.userRepository.update(userId, { theme: input.theme })
    return { message: 'Theme updated successfully' }
  }

  async updateProfile(userId: string, input: UpdateProfileType) {
    const { characterName, ...userFields } = input

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(userFields).length > 0) {
        await tx.user.update({ where: { id: userId }, data: userFields })
      }
      if (characterName !== undefined) {
        await tx.character.update({ where: { userId }, data: { name: characterName } })
      }
    })

    return this.userRepository.findById(userId)
  }

  async getProfile(userId: string) {
    return this.userRepository.findById(userId)
  }
}
