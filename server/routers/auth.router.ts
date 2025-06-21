import { TRPCError } from '@trpc/server'
import { supabase } from '../lib/supabase'
import { loginSchema, signUpSchema } from '../schemas/auth.schemas'
import { protectedProcedure, publicProcedure, t } from '../trpc'

export const authRouter = t.router({
  getSecretMessage: protectedProcedure.query(({ ctx }) => {
    return `This is a secret message for ${ctx.user.email}`
  }),
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ input }) => {
    const { data, error } = await supabase.auth.signUp({
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
  login: publicProcedure.input(loginSchema).mutation(async ({ input }) => {
    const { data, error } = await supabase.auth.signInWithPassword({
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
      },
      session: {
        accessToken: data.session?.access_token,
        refreshToken: data.session?.refresh_token
      }
    }
  }),
  logout: protectedProcedure.mutation(async () => {
    const { error } = await supabase.auth.signOut()

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
