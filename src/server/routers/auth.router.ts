import { updateProfileSchema, updateThemeSchema } from '@shared/schemas/auth.schemas'
import { protectedProcedure, rateLimit, RATE_LIMITS, t } from '../trpc'

export const authRouter = t.router({
  deleteAccount: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).mutation(async ({ ctx }) => {
    ctx.log.warn({ event: 'AUTH_ACCOUNT_DELETED', userId: ctx.user.id }, 'Account deletion initiated')
    return ctx.services.auth.deleteAccount(ctx.user.id)
  }),

  updateTheme: protectedProcedure.input(updateThemeSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.auth.updateTheme(ctx.user.id, input)
  }),

  updateProfile: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.auth.updateProfile(ctx.user.id, input)
    }),

  getProfile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.auth.getProfile(ctx.user.id)
  })
})
