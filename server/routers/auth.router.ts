import { TRPCError } from '@trpc/server'
import { env } from '../config'
import { defaultAreas } from '../schemas/areas.schemas'
import {
  emailSchema,
  loginSchema,
  refreshTokenSchema,
  signUpSchema,
  updatePasswordSchema,
  verifyOTPSchema
} from '../schemas/auth.schemas'
import { protectedProcedure, publicProcedure, t } from '../trpc'

export const authRouter = t.router({
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.auth.signInWithOtp({
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

    return {
      message: 'Magic link sent to your email'
    }
  }),
  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.auth.signInWithOtp({
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
  verifyOTP: publicProcedure.input(verifyOTPSchema).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.auth.verifyOtp({
      email: input.email,
      token: input.token,
      type: 'email'
    })

    if (error || !data.user || !data.session) {
      throw new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Invalid or expired magic link'
      })
    }

    // Check if this is a new user (first time login) and create default areas
    const { user } = data
    const existingAreas = await ctx.prisma.area.findMany({
      where: { userId: user.id }
    })

    if (existingAreas.length === 0) {
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
        id: user.id,
        email: user.email
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

    await ctx.prisma.$transaction([
      ctx.prisma.task.deleteMany({ where: { userId } }),
      ctx.prisma.habit.deleteMany({ where: { userId } }),
      ctx.prisma.objective.deleteMany({ where: { userId } }),
      ctx.prisma.area.deleteMany({ where: { userId } })
    ])

    const { error: supabaseError } = await ctx.supabase.auth.admin.deleteUser(userId)

    if (supabaseError) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to delete account'
      })
    }

    return {
      message: 'Account deleted successfully'
    }
  })
})
