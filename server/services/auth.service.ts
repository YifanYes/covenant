import type { LoginType, SignUpType } from '@shared/schemas/auth.schemas'
import type { AreaRepository } from '../repositories/area.repository'
import type { CharacterRepository } from '../repositories/character.repository'
import type { HabitRepository } from '../repositories/habit.repository'
import type { ObjectiveRepository } from '../repositories/objective.repository'
import type { TaskRepository } from '../repositories/task.repository'
import type { UserRepository } from '../repositories/user.repository'

export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private characterRepository: CharacterRepository,
    private habitRepository: HabitRepository,
    private taskRepository: TaskRepository,
    private objectiveRepository: ObjectiveRepository,
    private areaRepository: AreaRepository
  ) {}

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
    await this.userRepository.delete(userId)

    return { message: 'Account deleted successfully' }
  }
}
