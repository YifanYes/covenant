import { z } from 'zod'
import { publicIdSchema } from './ids.schemas'

export const DONE_LABEL = 'DONE' as const
export const PROTECTED_LABELS = ['TODO', 'DOING', 'DONE'] as const
export type ProtectedLabel = (typeof PROTECTED_LABELS)[number]

export const isProtectedLabel = (label: string): label is ProtectedLabel =>
  (PROTECTED_LABELS as readonly string[]).includes(label)

export const defaultUserTaskStatuses = [
  { label: 'TODO', color: 'slate', isDefault: true },
  { label: 'DOING', color: 'blue', isDefault: false },
  { label: 'DONE', color: 'green', isDefault: false }
] as const

export const createUserTaskStatusSchema = z.object({
  label: z.string().min(1, 'errors.required_field').max(50),
  color: z.string().optional()
})
export type CreateUserTaskStatusBodyType = z.infer<typeof createUserTaskStatusSchema>

export const updateUserTaskStatusSchema = z.object({
  publicId: publicIdSchema,
  label: z.string().min(1, 'errors.required_field').max(50).optional(),
  color: z.string().nullish()
})
export type UpdateUserTaskStatusBodyType = z.infer<typeof updateUserTaskStatusSchema>

export const deleteUserTaskStatusSchema = z.object({
  publicId: publicIdSchema
})
export type DeleteUserTaskStatusBodyType = z.infer<typeof deleteUserTaskStatusSchema>

export const bulkApplyUserTaskStatusesSchema = z.object({
  create: z.array(
    z.object({
      label: z.string().min(1, 'errors.required_field').max(50),
      color: z.string().nullish()
    })
  ),
  update: z.array(
    z.object({
      publicId: publicIdSchema,
      label: z.string().min(1, 'errors.required_field').max(50).optional(),
      color: z.string().nullish()
    })
  ),
  delete: z.array(z.object({ publicId: publicIdSchema }))
})
export type BulkApplyUserTaskStatusesBodyType = z.infer<typeof bulkApplyUserTaskStatusesSchema>
