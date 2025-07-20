import { TRPCError } from '@trpc/server'
import { env } from '../config'
import { loginSchema, refreshTokenSchema, signUpSchema } from '../schemas/auth.schemas'
import { protectedProcedure, publicProcedure, t } from '../trpc'

export const authRouter = t.router({
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: `${env.FRONT_URL}/login`
      }
    })

    if (error) {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR'
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
  })
})
