import { loginSchema, refreshTokenSchema, signUpSchema } from '@shared/schemas/auth.schemas'
import { TRPCError } from '@trpc/server'
import { env } from '../config'
import { protectedProcedure, publicProcedure, t } from '../trpc'

export const authRouter = t.router({
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    const { error } = await ctx.supabase.auth.signInWithOtp({
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

    return {
      message: 'Magic link sent to your email'
    }
  }),
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const { error } = await ctx.supabase.auth.signInWithOtp({
      email: input.email,
      options: {
        emailRedirectTo: `${env.FRONT_URL}/login`,
        shouldCreateUser: false
      }
    })

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: error.message
      })
    }

    return {
      message: 'Magic link sent to your email'
    }
  }),
  logout: protectedProcedure.mutation(async ({ ctx }) => {
    const { error } = await ctx.supabase.auth.signOut()

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR'
      })
    }

    return {
      message: 'Logout successfully'
    }
  }),
  refreshToken: publicProcedure.input(refreshTokenSchema).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.auth.setSession({
      access_token: input.accessToken,
      refresh_token: input.refreshToken
    })

    if (error || !data.session) {
      throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token refresh failed' })
    }

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token
    }
  }),
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id

    // Delete character first (cascade deletes CharacterClass)
    await ctx.prisma.character.deleteMany({ where: { userId: userId } })

    await ctx.prisma.$transaction([
      ctx.prisma.habitCompletion.deleteMany({ where: { userId } }),
      ctx.prisma.task.deleteMany({ where: { userId } }),
      ctx.prisma.habit.deleteMany({ where: { userId } }),
      ctx.prisma.objective.deleteMany({ where: { userId } }),
      ctx.prisma.area.deleteMany({ where: { userId } })
    ])

    const { error: supabaseError } = await ctx.supabase.auth.admin.deleteUser(userId)

    if (supabaseError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to delete account ${userId}`
      })
    }

    return {
      message: 'Account deleted successfully'
    }
  })
})
