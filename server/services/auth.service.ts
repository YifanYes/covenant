import type { LoginType, SignUpType } from '@shared/schemas/auth.schemas'
import { SupabaseClient } from '@supabase/supabase-js'
import { TRPCError } from '@trpc/server'
import { env } from '../config'
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

  constructor(
    private prisma: PrismaClient,
    private supabase: SupabaseClient
  ) {
    this.characterRepository = new CharacterRepository(prisma)
    this.habitRepository = new HabitRepository(prisma)
    this.taskRepository = new TaskRepository(prisma)
    this.objectiveRepository = new ObjectiveRepository(prisma)
    this.areaRepository = new AreaRepository(prisma)
  }

  async signUp(input: SignUpType) {
    const { error } = await this.supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        emailRedirectTo: `${env.FRONT_URL}/onboarding`,
        shouldCreateUser: true
      }
    })

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      })
    }

    return { message: 'Magic link sent to your email' }
  }

  async login(input: LoginType) {
    const { error } = await this.supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        emailRedirectTo: `${env.FRONT_URL}/login`,
        shouldCreateUser: true
      }
    })

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      })
    }

    return { message: 'Magic link sent to your email' }
  }

  async loginWithGoogle() {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${env.FRONT_URL}/login`
      }
    })

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      })
    }

    return { url: data.url }
  }

  async deleteAccount(userId: string) {
    // Delete character first
    await this.characterRepository.deleteManyByUserId(userId)

    await this.habitRepository.deleteCompletionsByUserId(userId)
    await this.taskRepository.deleteManyByUserId(userId)
    await this.habitRepository.deleteManyByUserId(userId)
    await this.objectiveRepository.deleteManyByUserId(userId)
    await this.areaRepository.deleteManyByUserId(userId)

    const { error: supabaseError } = await this.supabase.auth.admin.deleteUser(userId)

    if (supabaseError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to delete account ${userId}`
      })
    }

    return { message: 'Account deleted successfully' }
  }
}
