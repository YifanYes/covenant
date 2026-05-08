import { loginSchema, signUpSchema, updateThemeSchema } from '@shared/schemas/auth.schemas'
import { protectedProcedure, publicProcedure, rateLimit, RATE_LIMITS, t } from '../trpc'

export const authRouter = t.router({
  signUp: publicProcedure.use(rateLimit(RATE_LIMITS.auth)).input(signUpSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.auth.signUp(input)
  }),

  login: publicProcedure.use(rateLimit(RATE_LIMITS.auth)).input(loginSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.auth.login(input)
  }),

  loginWithGoogle: publicProcedure.use(rateLimit(RATE_LIMITS.auth)).mutation(async ({ ctx }) => {
    return ctx.services.auth.loginWithGoogle()
  }),

  deleteAccount: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).mutation(async ({ ctx }) => {
    ctx.log.warn({ event: 'AUTH_ACCOUNT_DELETED', userId: ctx.user.id }, 'Account deletion initiated')
    return ctx.services.auth.deleteAccount(ctx.user.id)
  }),

  updateTheme: protectedProcedure.input(updateThemeSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.auth.updateTheme(ctx.user.id, input)
  }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.auth.getProfile(ctx.user.id)
  })
})
