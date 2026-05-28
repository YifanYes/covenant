import type { JournalEntry, PrismaClient } from '@/generated/prisma'
import { TRPCError } from '@trpc/server'
import { RESOURCE_NOT_FOUND_OR_FORBIDDEN } from '../lib/errors'
import { generatePublicId } from '../lib/public-id'

function getUtcDayBounds(date?: Date, timezoneOffset = 0) {
  const now = date || new Date()
  const localTimestamp = now.getTime() - timezoneOffset * 60 * 1000
  const localDate = new Date(localTimestamp)

  const start = new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), 0, 0, 0, 0))
  start.setTime(start.getTime() + timezoneOffset * 60 * 1000)

  const end = new Date(Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate(), 23, 59, 59, 999))
  end.setTime(end.getTime() + timezoneOffset * 60 * 1000)

  return { start, end }
}

function getUtcDayBoundsFromDateStr(dateStr: string, timezoneOffset = 0) {
  const localMidnight = new Date(`${dateStr}T00:00:00.000Z`)
  const start = new Date(localMidnight.getTime() + timezoneOffset * 60 * 1000)
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1)
  return { start, end }
}

export class JournalRepository {
  constructor(private prisma: PrismaClient) {}

  private getClient(tx?: any): PrismaClient {
    return tx || this.prisma
  }

  async create(userId: string, content: string, mood?: string | null, color?: string | null, tx?: any): Promise<JournalEntry> {
    return this.getClient(tx).journalEntry.create({
      data: { userId, publicId: generatePublicId(), content, mood: mood || null, color: color || null }
    })
  }

  async update(id: bigint, userId: string, content?: string, mood?: string | null, color?: string | null, tx?: any): Promise<JournalEntry> {
    await this.findByIdOrThrow(id, userId, tx)
    return this.getClient(tx).journalEntry.update({
      where: { id },
      data: {
        ...(content !== undefined && { content }),
        ...(mood !== undefined && { mood: mood || null }),
        ...(color !== undefined && { color: color || null })
      }
    })
  }

  async softDelete(id: bigint, userId: string, tx?: any): Promise<void> {
    await this.findByIdOrThrow(id, userId, tx)
    await this.getClient(tx).journalEntry.update({
      where: { id },
      data: { deletedAt: new Date() }
    })
  }

  async findById(id: bigint, userId: string, tx?: any): Promise<JournalEntry | null> {
    const entry = await this.getClient(tx).journalEntry.findUnique({
      where: { id, deletedAt: null }
    })
    if (entry && entry.userId !== userId) return null
    return entry
  }

  async findByPublicId(publicId: string, userId: string, tx?: any): Promise<JournalEntry | null> {
    const entry = await this.getClient(tx).journalEntry.findUnique({
      where: { publicId, deletedAt: null }
    })
    if (entry && entry.userId !== userId) return null
    return entry
  }

  async findByIdOrThrow(id: bigint, userId: string, tx?: any): Promise<JournalEntry> {
    const entry = await this.findById(id, userId, tx)
    if (!entry) {
      throw new TRPCError({ code: 'NOT_FOUND', message: RESOURCE_NOT_FOUND_OR_FORBIDDEN })
    }
    return entry
  }

  async findByDate(userId: string, date: Date | string, timezoneOffset = 0, tx?: any): Promise<JournalEntry[]> {
    const { start, end } = typeof date === 'string'
      ? getUtcDayBoundsFromDateStr(date, timezoneOffset)
      : getUtcDayBounds(date, timezoneOffset)

    return this.getClient(tx).journalEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: start, lte: end }
      },
      orderBy: { createdAt: 'desc' }
    })
  }

  async findAll(
    userId: string,
    page: number,
    pageSize: number,
    tx?: any
  ): Promise<{ entries: JournalEntry[]; totalCount: number }> {
    const where = { userId, deletedAt: null }
    const client = this.getClient(tx)

    const [entries, totalCount] = await Promise.all([
      client.journalEntry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      client.journalEntry.count({ where })
    ])

    return { entries, totalCount }
  }

  async findMoodCalendar(
    userId: string,
    startDate: Date,
    endDate: Date,
    timezoneOffset = 0,
    tx?: any
  ): Promise<{ date: string; mood: string | null }[]> {
    const entries = await this.getClient(tx).journalEntry.findMany({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: startDate, lte: endDate }
      },
      select: { createdAt: true, mood: true },
      orderBy: { createdAt: 'desc' }
    })

    const toLocalDateStr = (d: Date) => {
      const shifted = new Date(d.getTime() - timezoneOffset * 60 * 1000)
      return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, '0')}-${String(shifted.getUTCDate()).padStart(2, '0')}`
    }

    const dayMap = new Map<string, string | null>()
    for (const entry of entries) {
      const dateKey = toLocalDateStr(entry.createdAt)
      if (!dayMap.has(dateKey)) {
        dayMap.set(dateKey, entry.mood)
      }
    }

    return Array.from(dayMap.entries()).map(([date, mood]) => ({ date, mood }))
  }

  async findEntryDates(userId: string, limit = 1000, tx?: any): Promise<Date[]> {
    const entries = await this.getClient(tx).journalEntry.findMany({
      where: { userId, deletedAt: null },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    return entries.map((e) => e.createdAt)
  }

  async hasEntryToday(userId: string, timezoneOffset = 0, tx?: any): Promise<boolean> {
    const { start, end } = getUtcDayBounds(undefined, timezoneOffset)

    const count = await this.getClient(tx).journalEntry.count({
      where: {
        userId,
        deletedAt: null,
        createdAt: { gte: start, lte: end }
      }
    })
    return count > 0
  }

  async deleteManyByUserId(userId: string, tx?: any): Promise<void> {
    await this.getClient(tx).journalEntry.deleteMany({
      where: { userId }
    })
  }
}
