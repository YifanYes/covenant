import { loginSchema, signUpSchema } from '@shared/schemas/auth.schemas'
import { protectedProcedure, publicProcedure, t } from '../trpc'

export const authRouter = t.router({
  signUp: publicProcedure.input(signUpSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.auth.signUp(input)
  }),

  login: publicProcedure.input(loginSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.auth.login(input)
  }),

  loginWithGoogle: publicProcedure.mutation(async ({ ctx }) => {
    return ctx.services.auth.loginWithGoogle()
  }),

  deleteAccount: protectedProcedure.mutation(async ({ ctx }) => {
    return ctx.services.auth.deleteAccount(ctx.user.id)
  })
})
