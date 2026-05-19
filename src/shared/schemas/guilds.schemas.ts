import { GUILD_MESSAGE_MAX_LENGTH } from '@shared/constants/guild.constants'
import { z } from 'zod'

export const GuildRole = {
  OWNER: 'OWNER',
  OFFICER: 'OFFICER',
  MEMBER: 'MEMBER'
} as const

export type GuildRoleType = (typeof GuildRole)[keyof typeof GuildRole]

export const guildRoleValues = [GuildRole.OWNER, GuildRole.OFFICER, GuildRole.MEMBER] as const

export const createGuildSchema = z.object({
  name: z.string().trim().min(3).max(80),
  description: z.string().trim().max(500).optional()
})
export type CreateGuildType = z.infer<typeof createGuildSchema>

export const updateGuildSchema = z.object({
  guildId: z.uuid(),
  name: z.string().trim().min(3).max(80).optional(),
  description: z.string().trim().max(500).optional()
})
export type UpdateGuildType = z.infer<typeof updateGuildSchema>

export const guildIdSchema = z.object({
  guildId: z.uuid()
})
export type GuildIdType = z.infer<typeof guildIdSchema>

export const sendMessageSchema = z.object({
  guildId: z.uuid(),
  content: z.string().trim().min(1).max(GUILD_MESSAGE_MAX_LENGTH)
})
export type SendMessageType = z.infer<typeof sendMessageSchema>

export const guildMessageCursorSchema = z.object({
  createdAt: z.iso.datetime(),
  id: z.uuid()
})
export type GuildMessageCursorType = z.infer<typeof guildMessageCursorSchema>

export const getMessagesSchema = z.object({
  guildId: z.uuid(),
  limit: z.number().int().min(1).max(100).optional(),
  cursor: guildMessageCursorSchema.optional()
})
export type GetMessagesType = z.infer<typeof getMessagesSchema>

export const deleteMessageSchema = z.object({
  messageId: z.uuid()
})
export type DeleteMessageType = z.infer<typeof deleteMessageSchema>

export const reportMessageSchema = z.object({
  messageId: z.uuid()
})
export type ReportMessageType = z.infer<typeof reportMessageSchema>

export const createInviteSchema = z.object({
  guildId: z.uuid(),
  expiresInHours: z.number().int().min(1).max(168).default(168),
  maxUses: z.number().int().positive().max(1000).optional()
})
export type CreateInviteType = z.infer<typeof createInviteSchema>

export const revokeInviteSchema = z.object({
  inviteId: z.uuid()
})
export type RevokeInviteType = z.infer<typeof revokeInviteSchema>

export const inviteTokenSchema = z.object({
  token: z.string().regex(/^[a-f0-9]{48}$/, 'Invalid invite token')
})
export type InviteTokenType = z.infer<typeof inviteTokenSchema>

export const kickMemberSchema = z.object({
  guildId: z.uuid(),
  targetUserId: z.string().min(1)
})
export type KickMemberType = z.infer<typeof kickMemberSchema>

export const transferOwnershipSchema = z.object({
  guildId: z.uuid(),
  newOwnerUserId: z.string().min(1)
})
export type TransferOwnershipType = z.infer<typeof transferOwnershipSchema>

export const updateRoleSchema = z.object({
  guildId: z.uuid(),
  targetUserId: z.string().min(1),
  role: z.enum([GuildRole.OFFICER, GuildRole.MEMBER])
})
export type UpdateRoleType = z.infer<typeof updateRoleSchema>

export const rewardPoolSchema = z.object({
  gold: z.number().int().nonnegative()
})
export type RewardPoolType = z.infer<typeof rewardPoolSchema>

export const startCampaignSchema = z.object({
  guildId: z.uuid(),
  templateId: z.string().min(1).max(64)
})
export type StartCampaignType = z.infer<typeof startCampaignSchema>

export const campaignIdSchema = z.object({
  campaignId: z.uuid()
})
export type CampaignIdType = z.infer<typeof campaignIdSchema>
