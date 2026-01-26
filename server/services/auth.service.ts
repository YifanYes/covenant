import type { LoginType, SignUpType } from '@shared/schemas/auth.schemas'
import type { PrismaClient } from '../generated/prisma'
import { AreaRepository } from '../repositories/area.repository'
import { CharacterRepository } from '../repositories/character.repository'
import { HabitRepository } from '../repositories/habit.repository'
import { ObjectiveRepository } from '../repositories/objective.repository'
import { TaskRepository } from '../repositories/task.repository'

export class AuthService {
  private characterRepository: CharacterRepository
  private habitRepository: HabitRepository
  private taskRepository: TaskRepository
  private objectiveRepository: ObjectiveRepository
  private areaRepository: AreaRepository

  constructor(private prisma: PrismaClient) {
    this.characterRepository = new CharacterRepository(prisma)
    this.habitRepository = new HabitRepository(prisma)
    this.taskRepository = new TaskRepository(prisma)
    this.objectiveRepository = new ObjectiveRepository(prisma)
    this.areaRepository = new AreaRepository(prisma)
  }

  async signUp(_input: SignUpType) {
    // Magic link is now handled client-side via Better Auth
    return { message: 'Use client-side magic link' }
  }

  async login(_input: LoginType) {
    // Magic link is now handled client-side via Better Auth
    return { message: 'Use client-side magic link' }
  }

  async loginWithGoogle() {
    // OAuth is now handled client-side via Better Auth
    return { message: 'Use client-side Google sign-in' }
  }

  async deleteAccount(userId: string) {
    // Delete user data first
    await this.characterRepository.deleteManyByUserId(userId)
    await this.habitRepository.deleteCompletionsByUserId(userId)
    await this.taskRepository.deleteManyByUserId(userId)
    await this.habitRepository.deleteManyByUserId(userId)
    await this.objectiveRepository.deleteManyByUserId(userId)
    await this.areaRepository.deleteManyByUserId(userId)

    // Delete user (cascades to sessions and accounts via Prisma relations)
    await this.prisma.user.delete({ where: { id: userId } })

    return { message: 'Account deleted successfully' }
  }
}
