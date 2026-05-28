import {
  campaignIdSchema,
  createGuildSchema,
  createInviteSchema,
  deleteMessageSchema,
  getMessagesSchema,
  guildIdSchema,
  inviteTokenSchema,
  kickMemberSchema,
  reportMessageSchema,
  revokeInviteSchema,
  sendMessageSchema,
  startCampaignSchema,
  transferOwnershipSchema,
  updateGuildSchema,
  updateMemberTitleSchema,
  updateRoleSchema,
  updateTitlePoolSchema
} from '@shared/schemas/guilds.schemas'
import { protectedProcedure, RATE_LIMITS, rateLimit, t } from '../trpc'

export const guildsRouter = t.router({
  getMyGuild: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.guild.getMyGuild(ctx.user.id)
  }),

  getMyProgression: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.guild.getMyProgression(ctx.user.id)
  }),

  create: protectedProcedure
    .use(rateLimit(RATE_LIMITS.strict))
    .input(createGuildSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.createGuild(input, ctx.user.id)
    }),

  update: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(updateGuildSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.updateGuild(input, ctx.user.id)
    }),

  dissolve: protectedProcedure
    .use(rateLimit(RATE_LIMITS.strict))
    .input(guildIdSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.dissolveGuild(input.guildSlug, ctx.user.id)
    }),

  leave: protectedProcedure.use(rateLimit(RATE_LIMITS.strict)).mutation(async ({ ctx }) => {
    return ctx.services.guild.leaveGuild(ctx.user.id)
  }),

  transferOwnership: protectedProcedure
    .use(rateLimit(RATE_LIMITS.strict))
    .input(transferOwnershipSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.transferOwnership(input, ctx.user.id)
    }),

  kickMember: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(kickMemberSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.kickMember(input, ctx.user.id)
    }),

  updateRole: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(updateRoleSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.updateRole(input, ctx.user.id)
    }),

  updateTitlePool: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(updateTitlePoolSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.updateTitlePool(input, ctx.user.id)
    }),

  updateMemberTitle: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(updateMemberTitleSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.updateMemberTitle(input, ctx.user.id)
    }),

  createInvite: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(createInviteSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.createInvite(input, ctx.user.id)
    }),

  revokeInvite: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(revokeInviteSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.revokeInvite(input.invitePublicId, ctx.user.id)
    }),

  listInvites: protectedProcedure.input(guildIdSchema).query(async ({ ctx, input }) => {
    return ctx.services.guild.listInvites(input.guildSlug, ctx.user.id)
  }),

  getInvitePreview: protectedProcedure
    .use(rateLimit(RATE_LIMITS.strict))
    .input(inviteTokenSchema)
    .query(async ({ ctx, input }) => {
      return ctx.services.guild.getInvitePreview(input.token)
    }),

  joinByToken: protectedProcedure
    .use(rateLimit(RATE_LIMITS.strict))
    .input(inviteTokenSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.joinByToken(input.token, ctx.user.id)
    }),

  getMessages: protectedProcedure.input(getMessagesSchema).query(async ({ ctx, input }) => {
    return ctx.services.guild.getMessages(input, ctx.user.id)
  }),

  sendMessage: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(sendMessageSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.sendMessage(input, ctx.user.id)
    }),

  deleteMessage: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(deleteMessageSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.deleteMessage(input.messagePublicId, ctx.user.id)
    }),

  reportMessage: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(reportMessageSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.reportMessage(input.messagePublicId, ctx.user.id)
    }),

  getCurrentCampaign: protectedProcedure.input(guildIdSchema).query(async ({ ctx, input }) => {
    return ctx.services.guild.getCurrentCampaign(input.guildSlug, ctx.user.id)
  }),

  getCampaignHistory: protectedProcedure.input(guildIdSchema).query(async ({ ctx, input }) => {
    return ctx.services.guild.listCampaignHistory(input.guildSlug, ctx.user.id)
  }),

  startCampaign: protectedProcedure
    .use(rateLimit(RATE_LIMITS.strict))
    .input(startCampaignSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.startCampaign(input, ctx.user.id)
    }),

  claimCampaignReward: protectedProcedure
    .use(rateLimit(RATE_LIMITS.write))
    .input(campaignIdSchema)
    .mutation(async ({ ctx, input }) => {
      return ctx.services.guild.claimCampaignReward(input.campaignPublicId, ctx.user.id)
    })
})
