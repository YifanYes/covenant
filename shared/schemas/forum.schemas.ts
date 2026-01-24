import { z } from 'zod'

export enum Faction {
  ALCHEMISTS_LEAGUE = 'ALCHEMISTS_LEAGUE',
  BLOOD_PACT = 'BLOOD_PACT',
  CRIMSON_INQUISITION = 'CRIMSON_INQUISITION',
  DEATH_MARCH = 'DEATH_MARCH',
  HOLY_KNIGHTS = 'HOLY_KNIGHTS',
  LEGION = 'LEGION'
}

export const createPostSchema = z.object({
  title: z.string().min(1, 'errors.required_field'),
  description: z.string().optional(),
  faction: z.enum(Faction)
})
export type CreatePostType = z.input<typeof createPostSchema>

export const updatePostSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1, 'errors.required_field'),
  description: z.string().optional()
})
export type UpdatePostType = z.input<typeof updatePostSchema>

export const postIdSchema = z.object({
  id: z.uuid()
})

export const createCommentSchema = z.object({
  postId: z.uuid(),
  content: z.string().min(1, 'errors.required_field')
})
export type CreateCommentType = z.input<typeof createCommentSchema>

export const updateCommentSchema = z.object({
  id: z.uuid(),
  content: z.string().min(1, 'errors.required_field')
})
export type UpdateCommentType = z.input<typeof updateCommentSchema>

export const commentIdSchema = z.object({
  id: z.uuid()
})

export const joinFactionSchema = z.object({
  faction: z.enum(Faction)
})
export type JoinFactionType = z.input<typeof joinFactionSchema>

export const leaveFactionSchema = z.object({})

export const forumListInputSchema = z.object({
  faction: z.enum(Faction)
})
