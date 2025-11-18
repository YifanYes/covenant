import { TRPCError } from '@trpc/server'
import { env } from '../config'
import { defaultAreas } from '../schemas/areas.schemas'
import {
  emailSchema,
  loginSchema,
  refreshTokenSchema,
  signUpSchema,
  updatePasswordSchema
} from '../schemas/auth.schemas'
import { protectedProcedure, publicProcedure, t } from '../trpc'

export const authRouter = t.router({
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${env.FRONT_URL}/login?verified=true`
      }
    })

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR'
      })
    }

    if (data.user) {
      const { user } = data

      await ctx.prisma.area.createMany({
        data: defaultAreas.map((defaultArea) => ({
          name: defaultArea.name,
          color: defaultArea.color,
          icon: defaultArea.icon,
          userId: user.id
        }))
      })
    }

    return {
      user: {
        id: data.user?.id,
        email: data.user?.email
      }
    }
  }),
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.auth.signInWithPassword({
      email: input.email,
      password: input.password
    })

    if (error?.code === 'invalid_credentials') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Invalid credentials'
      })
    }

    if (error || !data.user || !data.session) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR'
      })
    }

    return {
      user: {
        id: data.user.id,
        email: data.user.email
      },
      session: {
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token
      }
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
  resetPassword: publicProcedure.input(emailSchema).mutation(async ({ ctx, input }) => {
    const { error } = await ctx.supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: `${env.FRONT_URL}/recover-password`
    })

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR'
      })
    }

    return {
      message: 'Password reset successfully'
    }
  }),
  updatePassword: publicProcedure.input(updatePasswordSchema).mutation(async ({ ctx, input }) => {
    await ctx.supabase.auth.setSession({
      access_token: input.accessToken,
      refresh_token: input.refreshToken
    })

    const { error } = await ctx.supabase.auth.updateUser({
      password: input.password
    })

    if (error?.code === 'same_password') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'New password is the same as the current password'
      })
    }

    if (error?.name === 'AuthSessionMissingError') {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Session expired'
      })
    }

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR'
      })
    }

    await ctx.supabase.auth.signOut()

    return {
      message: 'Password updated successfully'
    }
  }),
  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.user.id

    const { error: supabaseError } = await ctx.supabase.auth.admin.deleteUser(userId)

    if (supabaseError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete account'
      })
    }

    await ctx.prisma.$transaction([
      ctx.prisma.task.deleteMany({ where: { userId } }),
      ctx.prisma.habit.deleteMany({ where: { userId } }),
      ctx.prisma.objective.deleteMany({ where: { userId } }),
      ctx.prisma.area.deleteMany({ where: { userId } })
    ])

    return {
      message: 'Account deleted successfully'
    }
  })
})
