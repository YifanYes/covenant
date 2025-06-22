import { TRPCError } from '@trpc/server'
import { loginSchema, signUpSchema } from '../schemas/auth.schemas'
import { protectedProcedure, publicProcedure, t } from '../trpc'

export const authRouter = t.router({
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    const { data, error } = await ctx.supabase.auth.signUp({
      email: input.email,
      password: input.password
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
  })
})
