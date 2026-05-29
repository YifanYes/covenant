import { sanitizeRichText } from '@shared/lib/sanitize-rich-text.lib'
import type { CreateJournalEntryType, UpdateJournalEntryType } from '@shared/schemas/journal.schemas'
import { TRPCError } from '@trpc/server'
import { Prisma, type PrismaClient } from '@/generated/prisma'
import { analytics as defaultAnalytics, type AnalyticsService } from '../lib/analytics'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN, resourceNotFound } from '../lib/errors'
import { logger } from '../lib/logger'
import type { JournalRepository } from '../repositories/journal.repository'
import type { ManaService } from './mana.service'

const log = logger.child({ service: 'journal' })

const notFound = () => new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })

export class JournalService {
  constructor(
    private prisma: PrismaClient,
    private journalRepository: JournalRepository,
    private manaService: ManaService,
    private analytics: AnalyticsService = defaultAnalytics
  ) {}

  private async resolve(publicId: string, userId: string): Promise<bigint> {
    const entry = await this.journalRepository.findByPublicId(publicId, userId)
    if (!entry) throw notFound()
    return entry.id
  }

  async create(userId: string, input: CreateJournalEntryType) {
    let manaEarned = 0
    let reserveGained = 0
    let createdNew = false
    let entry: Awaited<ReturnType<typeof this.journalRepository.create>>
    const sanitizedContent = sanitizeRichText(input.content)

    try {
      entry = await this.prisma.$transaction(async (tx) => {
        return this.journalRepository.create(userId, sanitizedContent, input.mood, input.color, tx)
      })
      createdNew = true
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const entries = await this.journalRepository.findByDate(userId, new Date(), input.timezoneOffset)
        entry = entries[0]
      } else {
        throw error
      }
    }

    if (createdNew) {
      const result = await this.manaService.addManaFromCompletion(userId, 'journal')
      if (result.success) {
        manaEarned = result.manaApplied
        reserveGained = result.reserveGained
      }
      this.analytics.track(userId, 'journal_entry_created', {
        entry_id: entry.publicId,
        mana_earned: manaEarned,
        reserve_gained: reserveGained
      })
    }

    const dates = await this.journalRepository.findEntryDates(userId, 1000)
    const streak = this.manaService.calculateStreakFromDates(dates, input.timezoneOffset)

    return { entry, manaEarned, reserveGained, streak }
  }

  async update(userId: string, input: UpdateJournalEntryType) {
    const id = await this.resolve(input.publicId, userId)
    const sanitizedContent = input.content !== undefined ? sanitizeRichText(input.content) : undefined
    const entry = await this.journalRepository.update(id, userId, sanitizedContent, input.mood, input.color)
    return entry
  }

  async delete(userId: string, publicId: string) {
    const id = await this.resolve(publicId, userId)
    await this.journalRepository.softDelete(id, userId)
  }

  async getById(userId: string, publicId: string) {
    const entry = await this.journalRepository.findByPublicId(publicId, userId)
    if (!entry) {
      log.warn({ entryPublicId: publicId, userId }, 'getById: journal entry not found or not owned by user')
      throw resourceNotFound()
    }
    return entry
  }

  async getByDate(userId: string, date: string, timezoneOffset = 0) {
    const match = date.match(/^(\d{4})-(\d{2})-(\d{2})$/)
    if (!match) {
      throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid date format' })
    }
    const entries = await this.journalRepository.findByDate(userId, date, timezoneOffset)
    return entries
  }

  async getAll(userId: string, input: { page: number; pageSize: number }) {
    const { entries, totalCount } = await this.journalRepository.findAll(userId, input.page, input.pageSize)
    return {
      entries,
      totalCount,
      page: input.page,
      pageSize: input.pageSize,
      totalPages: Math.ceil(totalCount / input.pageSize)
    }
  }

  async getMoodCalendar(userId: string, month: number, year: number, timezoneOffset = 0) {
    const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0))
    startDate.setTime(startDate.getTime() + timezoneOffset * 60 * 1000)

    const endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999))
    endDate.setTime(endDate.getTime() + timezoneOffset * 60 * 1000)

    const days = await this.journalRepository.findMoodCalendar(userId, startDate, endDate, timezoneOffset)
    return { days }
  }

  async getStreak(userId: string, timezoneOffset = 0) {
    const dates = await this.journalRepository.findEntryDates(userId, 1000)
    const streak = this.manaService.calculateStreakFromDates(dates, timezoneOffset)
    const hasEntryToday = await this.journalRepository.hasEntryToday(userId, timezoneOffset)
    return { streak, hasEntryToday }
  }
}
