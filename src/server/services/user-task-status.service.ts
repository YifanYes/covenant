import type {
  BulkApplyUserTaskStatusesBodyType,
  CreateUserTaskStatusBodyType,
  UpdateUserTaskStatusBodyType
} from '@shared/schemas/user-task-statuses.schemas'
import { isProtectedLabel, PROTECTED_LABELS } from '@shared/schemas/user-task-statuses.schemas'
import { TRPCError } from '@trpc/server'
import type { UserTaskStatusRepository } from '../repositories/user-task-status.repository'

const badRequest = (message: string) => new TRPCError({ code: 'BAD_REQUEST', message })

export class UserTaskStatusService {
  constructor(private userTaskStatusRepository: UserTaskStatusRepository) {}

  async getAll(userId: string) {
    const statuses = await this.userTaskStatusRepository.findAll(userId)
    return { statuses }
  }

  async create(userId: string, input: CreateUserTaskStatusBodyType) {
    if (isProtectedLabel(input.label)) {
      throw badRequest('errors.task_status.label_reserved')
    }

    const existing = await this.userTaskStatusRepository.findAll(userId)
    if (existing.some((s) => s.label === input.label)) {
      throw badRequest('errors.task_status.label_collision')
    }

    const status = await this.userTaskStatusRepository.create(userId, input)
    return { status }
  }

  async update(userId: string, input: UpdateUserTaskStatusBodyType) {
    const existing = await this.userTaskStatusRepository.findByPublicIdOrThrow(input.publicId, userId)

    if (input.label !== undefined && input.label !== existing.label) {
      if (isProtectedLabel(existing.label)) {
        throw badRequest('errors.task_status.protected_locked')
      }
      if (isProtectedLabel(input.label)) {
        throw badRequest('errors.task_status.label_reserved')
      }
      const all = await this.userTaskStatusRepository.findAll(userId)
      if (all.some((s) => s.id !== existing.id && s.label === input.label)) {
        throw badRequest('errors.task_status.label_collision')
      }
    }

    const status = await this.userTaskStatusRepository.update(existing.id, userId, input)
    return { status }
  }

  async delete(userId: string, publicId: string) {
    const existing = await this.userTaskStatusRepository.findByPublicIdOrThrow(publicId, userId)

    if (isProtectedLabel(existing.label)) {
      throw badRequest('errors.task_status.cannot_delete_protected')
    }

    const total = await this.userTaskStatusRepository.countByUserId(userId)
    if (total <= 1) {
      throw badRequest('errors.task_status.min_one_required')
    }

    let reassignTarget = await this.userTaskStatusRepository.findDefault(userId)

    if (!reassignTarget || reassignTarget.id === existing.id) {
      const next = await this.userTaskStatusRepository.findNextAfter(userId, existing.id)
      if (!next) {
        throw badRequest('errors.task_status.min_one_required')
      }
      await this.userTaskStatusRepository.setDefault(userId, next.id)
      reassignTarget = { ...next, isDefault: true }
    }

    await this.userTaskStatusRepository.delete(existing.id, userId, reassignTarget.id)
    return { message: 'Task status deleted successfully' }
  }

  async bulkApply(userId: string, input: BulkApplyUserTaskStatusesBodyType) {
    const existing = await this.userTaskStatusRepository.findAll(userId)
    const existingByPublicId = new Map(existing.map((s) => [s.publicId, s]))

    const deleteIds = new Set<bigint>()
    for (const del of input.delete) {
      const cur = existingByPublicId.get(del.publicId)
      if (!cur) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Task status ${del.publicId} not found` })
      }
      if (isProtectedLabel(cur.label)) {
        throw badRequest('errors.task_status.cannot_delete_protected')
      }
      deleteIds.add(cur.id)
    }

    const updates: Array<{ id: bigint; label?: string; color?: string | null }> = []
    for (const upd of input.update) {
      const cur = existingByPublicId.get(upd.publicId)
      if (!cur) {
        throw new TRPCError({ code: 'NOT_FOUND', message: `Task status ${upd.publicId} not found` })
      }
      if (deleteIds.has(cur.id)) continue
      if (upd.label !== undefined && upd.label !== cur.label) {
        if (isProtectedLabel(cur.label)) {
          throw badRequest('errors.task_status.protected_locked')
        }
        if (isProtectedLabel(upd.label)) {
          throw badRequest('errors.task_status.label_reserved')
        }
      }
      updates.push({ id: cur.id, label: upd.label, color: upd.color })
    }

    for (const c of input.create) {
      if (isProtectedLabel(c.label)) {
        throw badRequest('errors.task_status.label_reserved')
      }
    }

    const updatedById = new Map(updates.map((u) => [u.id, u]))
    const finalLabels = new Set<string>()
    const collide = (label: string) => {
      if (finalLabels.has(label)) {
        throw badRequest('errors.task_status.label_collision')
      }
      finalLabels.add(label)
    }
    for (const s of existing) {
      if (deleteIds.has(s.id)) continue
      collide(updatedById.get(s.id)?.label ?? s.label)
    }
    for (const c of input.create) {
      collide(c.label)
    }

    if (finalLabels.size < 1) {
      throw badRequest('errors.task_status.min_one_required')
    }
    for (const p of PROTECTED_LABELS) {
      if (!finalLabels.has(p)) {
        throw badRequest('errors.task_status.protected_required')
      }
    }

    const remaining = existing.filter((s) => !deleteIds.has(s.id))
    const reassignTarget = remaining.find((s) => s.isDefault) ?? remaining[0]
    if (!reassignTarget) {
      throw badRequest('errors.task_status.min_one_required')
    }

    await this.userTaskStatusRepository.bulkApply(userId, {
      create: input.create.map((c) => ({ label: c.label, color: c.color ?? null })),
      update: updates,
      delete: [...deleteIds],
      reassignToStatusId: reassignTarget.id
    })

    const statuses = await this.userTaskStatusRepository.findAll(userId)
    return { statuses }
  }
}
