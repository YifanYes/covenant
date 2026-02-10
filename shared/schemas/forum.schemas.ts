import { z } from 'zod'
import { Faction } from '../constants/activities'

export const createPostSchema = z.object({
  title: z.string().min(1, 'errors.required_field'),
  content: z.string().min(1, 'errors.required_field'),
  faction: z.enum(Faction)
})
export type CreatePostType = z.input<typeof createPostSchema>

export const createReplySchema = z.object({
  parentId: z.uuid(),
  content: z.string().min(1, 'errors.required_field')
})
export type CreateReplyType = z.input<typeof createReplySchema>

export const updateCommentSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1, 'errors.required_field').optional(),
  content: z.string().min(1, 'errors.required_field')
})
export type UpdateCommentType = z.input<typeof updateCommentSchema>

export const commentIdSchema = z.object({
  id: z.uuid()
})

export const forumListInputSchema = z.object({
  faction: z.enum(Faction)
})

export const joinFactionSchema = z.object({
  faction: z.enum(Faction)
})
export type JoinFactionType = z.input<typeof joinFactionSchema>

export const leaveFactionSchema = z.object({})
