import {
  commentIdSchema,
  createCommentSchema,
  createPostSchema,
  forumListInputSchema,
  joinFactionSchema,
  leaveFactionSchema,
  postIdSchema,
  updateCommentSchema,
  updatePostSchema
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
    return ctx.services.forum.getPosts(input.faction)
  }),

  getPostById: protectedProcedure.input(postIdSchema).query(async ({ ctx, input }) => {
    return ctx.services.forum.getPostById(input.id)
  }),

  createPost: protectedProcedure.input(createPostSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.createPost(ctx.user.id, input)
  }),

  updatePost: protectedProcedure.input(updatePostSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.updatePost(ctx.user.id, input.id, input)
  }),

  deletePost: protectedProcedure.input(postIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.deletePost(ctx.user.id, input.id)
  }),

  getComments: protectedProcedure.input(postIdSchema).query(async ({ ctx, input }) => {
    return ctx.services.forum.getComments(input.id)
  }),

  createComment: protectedProcedure.input(createCommentSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.createComment(ctx.user.id, input)
  }),

  updateComment: protectedProcedure.input(updateCommentSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.updateComment(ctx.user.id, input.id, input)
  }),

  deleteComment: protectedProcedure.input(commentIdSchema).mutation(async ({ ctx, input }) => {
    return ctx.services.forum.deleteComment(ctx.user.id, input.id)
  })
})
