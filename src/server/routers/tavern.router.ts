import {
  deleteTavernMessageSchema,
  getTavernMessagesSchema,
  sendTavernMessageSchema,
  tavernMessageIdSchema
} from '@shared/schemas/tavern.schemas'
import { protectedProcedure, RATE_LIMITS, rateLimit, t } from '../trpc'

export const tavernRouter = t.router({
  getMessages: protectedProcedure.input(getTavernMessagesSchema).query(async ({ ctx, input }) => {
    return ctx.services.tavern.getMessages(input)
  }),

  sendMessage: protectedProcedure
    .use(rateLimit(RATE_LIMITS.chat))
    .input(sendTavernMessageSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.tavern.sendMessage(input, ctx.user.id)
    }),

  deleteMessage: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(deleteTavernMessageSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.tavern.deleteMessage(input.publicId, ctx.user.id)
    }),

  reportMessage: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(tavernMessageIdSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.tavern.reportMessage(input.publicId, ctx.user.id)
    })
})
