import type { CreateJournalEntryType, UpdateJournalEntryType } from '@shared/schemas/journal.schemas'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '@/generated/prisma'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import type { JournalRepository } from '../repositories/journal.repository'
import type { DiceService } from './dice.service'

export class JournalService {
  constructor(
    private prisma: PrismaClient,
    private journalRepository: JournalRepository,
    private diceService: DiceService
  ) {}

  async create(userId: string, input: CreateJournalEntryType) {
    let diceEarned = 0
    let entry: Awaited<ReturnType<typeof this.journalRepository.create>>

    try {
      entry = await this.prisma.$transaction(async (tx) => {
        return this.journalRepository.create(userId, input.content, input.mood, input.color, tx)
      })
      diceEarned = 1
    } catch (error) {
      if (error instanceof Error && (error as any).code === 'P2002') {
        diceEarned = 0
        const entries = await this.journalRepository.findByDate(userId, new Date(), input.timezoneOffset)
        entry = entries[0]
      } else {
        throw error
      }
    }

    if (diceEarned === 1) {
      const result = await this.diceService.addDiceToBank(userId, 1)
      if (result.success) {
        diceEarned = result.earned
      } else {
        diceEarned = 0
      }
    }

    const dates = await this.journalRepository.findEntryDates(userId, 1000)
    const streak = this.diceService.calculateStreakFromDates(dates, input.timezoneOffset)

    return { entry, diceEarned, streak }
  }

  async update(userId: string, input: UpdateJournalEntryType) {
    const entry = await this.journalRepository.update(input.id, userId, input.content, input.mood, input.color)
    return entry
  }

  async delete(userId: string, id: string) {
    await this.journalRepository.findByIdOrThrow(id, userId)
    await this.journalRepository.softDelete(id, userId)
  }

  async getById(userId: string, id: string) {
    const entry = await this.journalRepository.findById(id, userId)
    if (!entry) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
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
    const streak = this.diceService.calculateStreakFromDates(dates, timezoneOffset)
    const hasEntryToday = await this.journalRepository.hasEntryToday(userId, timezoneOffset)
    return { streak, hasEntryToday }
  }
}
