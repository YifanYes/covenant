import type { PrismaClient } from '@/generated/prisma'
import type { UpdateThemeType } from '@shared/schemas/auth.schemas'
import type { AreaRepository } from '../repositories/area.repository'
import type { CharacterRepository } from '../repositories/character.repository'
import type { HabitRepository } from '../repositories/habit.repository'
import type { ObjectiveRepository } from '../repositories/objective.repository'
import type { TaskRepository } from '../repositories/task.repository'
import type { UserRepository } from '../repositories/user.repository'

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private userRepository: UserRepository,
    private characterRepository: CharacterRepository,
    private habitRepository: HabitRepository,
    private taskRepository: TaskRepository,
    private objectiveRepository: ObjectiveRepository,
    private areaRepository: AreaRepository
  ) {}

  async deleteAccount(userId: string) {
    // Run all deletions in a single transaction so a failure mid-way doesn't leave
    // the database in a partially-deleted inconsistent state.
    await this.prisma.$transaction(async (tx) => {
      await tx.character.deleteMany({ where: { userId } })
      await tx.habitCompletion.deleteMany({ where: { userId } })
      await tx.task.deleteMany({ where: { userId } })
      await tx.habit.deleteMany({ where: { userId } })
      await tx.objective.deleteMany({ where: { userId } })
      await tx.area.deleteMany({ where: { userId } })
      // User delete cascades to sessions and accounts via Prisma relations.
      await tx.user.delete({ where: { id: userId } })
    })

    return { message: 'Account deleted successfully' }
  }

  async updateTheme(userId: string, input: UpdateThemeType) {
    await this.userRepository.update(userId, { theme: input.theme })
    return { message: 'Theme updated successfully' }
  }

  async getProfile(userId: string) {
    return this.userRepository.findById(userId)
  }
}
