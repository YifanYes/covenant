import type { PrismaClient } from '@/generated/prisma'
import type { UpdateProfileType, UpdateThemeType } from '@shared/schemas/auth.schemas'
import { TRPCError } from '@trpc/server'
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
    await this.prisma.userSettings.upsert({
      where: { userId },
      update: { theme: input.theme },
      create: { userId, theme: input.theme }
    })
    return { message: 'Theme updated successfully' }
  }

  async updateProfile(userId: string, input: UpdateProfileType) {
    const { characterName, ...settingsFields } = input

    if (
      settingsFields.showListTab === false &&
      settingsFields.showKanbanTab === false &&
      settingsFields.showTableTab === false &&
      settingsFields.showMatrixTab === false
    ) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'tasks.settings.at_least_one_visible' })
    }

    if (
      settingsFields.showTodayTab === false &&
      settingsFields.showHabitsListTab === false &&
      settingsFields.showGridTab === false &&
      settingsFields.showHeatmapTab === false
    ) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'habits.settings.at_least_one_visible' })
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(settingsFields).length > 0) {
        await tx.userSettings.upsert({
          where: { userId },
          update: settingsFields,
          create: { userId, ...settingsFields }
        })
      }
      if (characterName !== undefined) {
        await tx.character.update({ where: { userId }, data: { name: characterName } })
      }
    })

    return this.userRepository.findById(userId)
  }

  async getProfile(userId: string) {
    const profile = await this.userRepository.findById(userId)
    if (profile && !profile.userSettings) {
      const userSettings = await this.prisma.userSettings.upsert({
        where: { userId },
        create: { userId },
        update: {}
      })
      return { ...profile, userSettings }
    }
    return profile
  }
}
