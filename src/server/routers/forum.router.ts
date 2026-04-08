import {
  commentIdSchema,
  createPostSchema,
  createReplySchema,
  forumListInputSchema,
  joinFactionSchema,
  leaveFactionSchema,
  updateCommentSchema
} from '@shared/schemas/forum.schemas'
import { protectedProcedure, t } from '../trpc'

export const forumRouter = t.router({
  getFactions: protectedProcedure.query(async ({ ctx }) => {
    return ctx.services.forum.getFactions()
  }),

  joinFaction: protectedProcedure.input(joinFactionSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.joinFaction(ctx.user.id, input.faction)
  }),

  leaveFaction: protectedProcedure.input(leaveFactionSchema).mutation(async ({ ctx }) => {
    return ctx.services.forum.leaveFaction(ctx.user.id)
  }),

  getPosts: protectedProcedure.input(forumListInputSchema).query(async ({ ctx, input }) => {
    return ctx.services.forum.getPosts(ctx.user.id, input.faction)
  }),

  getPostWithReplies: protectedProcedure.input(commentIdSchema).query(async ({ ctx, input }) => {
    return ctx.services.forum.getPostWithReplies(ctx.user.id, input.id)
  }),

  createPost: protectedProcedure.input(createPostSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.createPost(ctx.user.id, input)
  }),

  createReply: protectedProcedure.input(createReplySchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.createReply(ctx.user.id, input)
  }),

  updateComment: protectedProcedure.input(updateCommentSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.updateComment(ctx.user.id, input.id, input)
  }),

  deleteComment: protectedProcedure.input(commentIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.deleteComment(ctx.user.id, input.id)
  })
})
