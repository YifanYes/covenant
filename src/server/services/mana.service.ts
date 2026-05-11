import { getTaskMana, MANA_REWARDS, type ManaSource, type TaskImpact } from '@shared/constants/rewards'
import type { PrismaClient } from '@/generated/prisma'
import type { CharacterRepository } from '../repositories/character.repository'

export interface ManaGrantContext {
  impact?: TaskImpact | string | null
}

export interface ManaGrantResult {
  success: boolean
  amount: number
  manaApplied: number
  reserveGained: number
  newMana: number
  newReserve: number
}

export interface ReserveBreakdown {
  habits: { count: number; mana: number }
  tasks: { count: number; mana: number }
  objectives: { count: number; mana: number }
  journals: { count: number; mana: number }
  total: number
}

export class ManaService {
  constructor(
    private characterRepository: CharacterRepository,
    private prisma: PrismaClient
  ) {}

  /**
   * Grant mana from a real-life completion. Surplus above maxMana overflows into Reserve (uncapped).
   * Returns the breakdown so the caller can toast "+N mana / +M reserve".
   */
  async addManaFromCompletion(
    userId: string,
    source: ManaSource,
    ctx: ManaGrantContext = {}
  ): Promise<ManaGrantResult> {
    const character = await this.characterRepository.findWithClasses(userId)
    if (!character) {
      return { success: false, amount: 0, manaApplied: 0, reserveGained: 0, newMana: 0, newReserve: 0 }
    }

    const amount = this.amountFor(source, ctx)
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) {
      return { success: false, amount, manaApplied: 0, reserveGained: 0, newMana: 0, newReserve: 0 }
    }

    const room = Math.max(0, currentClass.maxMana - currentClass.mana)
    const manaApplied = Math.min(amount, room)
    const reserveGained = amount - manaApplied
    const newMana = currentClass.mana + manaApplied
    const currentReserve = character.manaReserve ?? 0
    const newReserve = currentReserve + reserveGained

    if (manaApplied > 0) {
      await this.characterRepository.updateHealth(currentClass.id, currentClass.health, newMana)
    }
    if (reserveGained > 0) {
      await this.characterRepository.updateManaReserve(character.id, newReserve)
    }

    return { success: true, amount, manaApplied, reserveGained, newMana, newReserve }
  }

  /**
   * Drain Reserve into active mana until full or Reserve is empty.
   * Called by quest.service at the start of every Encounter (initial spawn + each spawn after a defeat).
   */
  async topUpFromReserve(characterId: string): Promise<{ added: number; newMana: number; newReserve: number }> {
    const character = await this.characterRepository.findByIdWithClasses(characterId)
    if (!character) return { added: 0, newMana: 0, newReserve: 0 }
    const currentClass = character.classes.find((c) => c.className === character.currentClass)
    if (!currentClass) return { added: 0, newMana: 0, newReserve: character.manaReserve ?? 0 }

    const reserve = character.manaReserve ?? 0
    const room = Math.max(0, currentClass.maxMana - currentClass.mana)
    const added = Math.min(reserve, room)
    if (added <= 0) return { added: 0, newMana: currentClass.mana, newReserve: reserve }

    const newMana = currentClass.mana + added
    const newReserve = reserve - added

    await this.characterRepository.updateHealth(currentClass.id, currentClass.health, newMana)
    await this.characterRepository.updateManaReserve(character.id, newReserve)

    return { added, newMana, newReserve }
  }

  /**
   * Today's mana grants by source. Daily window: user-local midnight to next midnight (UTC fallback if no timezone).
   * Used for the Reserve `+N` hover tooltip on the combat MP bar and the out-of-combat indicator.
   */
  async getTodayReserveBreakdown(userId: string, timezoneOffset = 0): Promise<ReserveBreakdown> {
    const now = new Date()
    const localNow = new Date(now.getTime() - timezoneOffset * 60 * 1000)
    const startLocal = new Date(Date.UTC(localNow.getUTCFullYear(), localNow.getUTCMonth(), localNow.getUTCDate(), 0, 0, 0, 0))
    const startUtc = new Date(startLocal.getTime() + timezoneOffset * 60 * 1000)
    const endUtc = new Date(startUtc.getTime() + 24 * 60 * 60 * 1000)

    const [habitCount, taskRows, objectiveCount, journalCount] = await Promise.all([
      this.prisma.habitCompletion.count({ where: { userId, completedAt: { gte: startUtc, lt: endUtc } } }),
      this.prisma.task.findMany({
        where: { userId, completedAt: { gte: startUtc, lt: endUtc } },
        select: { impact: true }
      }),
      this.prisma.objective.count({ where: { userId, completedAt: { gte: startUtc, lt: endUtc } } }),
      this.prisma.journalEntry.count({ where: { userId, createdAt: { gte: startUtc, lt: endUtc } } })
    ])

    const taskMana = taskRows.reduce((s: number, t: { impact: string | null }) => s + getTaskMana(t.impact), 0)
    const habitMana = habitCount * MANA_REWARDS.HABIT
    const objectiveMana = objectiveCount * MANA_REWARDS.OBJECTIVE
    const journalMana = journalCount * MANA_REWARDS.JOURNAL

    return {
      habits: { count: habitCount, mana: habitMana },
      tasks: { count: taskRows.length, mana: taskMana },
      objectives: { count: objectiveCount, mana: objectiveMana },
      journals: { count: journalCount, mana: journalMana },
      total: habitMana + taskMana + objectiveMana + journalMana
    }
  }

  /**
   * Idempotent: scrub `mana_potion` entries from inventory+loadout, credit 25g per row, set scrubbed flag.
   * Called from CharacterService.getCurrentClass for backward compatibility with pre-Phase-2A characters.
   */
  async scrubManaPotions(userId: string): Promise<{ removed: number; goldRefunded: number }> {
    const character = await this.characterRepository.findWithClasses(userId)
    if (!character) return { removed: 0, goldRefunded: 0 }

    const data = (character.data as Record<string, unknown>) ?? {}
    if (data.scrubbedManaPotions === true) return { removed: 0, goldRefunded: 0 }

    const inventory = Array.isArray(character.inventory) ? [...character.inventory] : []
    const loadout = Array.isArray(character.loadout) ? [...character.loadout] : []
    const isManaPotion = (i: unknown) => {
      if (!i || typeof i !== 'object') return false
      const item = i as { definitionId?: string }
      return item.definitionId === 'mana_potion'
    }
    const newInventory = inventory.filter((i: unknown) => !isManaPotion(i))
    const newLoadout = loadout.filter((i: unknown) => !isManaPotion(i))
    const removed = inventory.length - newInventory.length + (loadout.length - newLoadout.length)
    const goldRefunded = removed * 25

    if (removed > 0) {
      await this.characterRepository.updateInventoryAndLoadout(character.id, newInventory, newLoadout)
      if (goldRefunded > 0) {
        await this.characterRepository.addGold(character.id, goldRefunded)
      }
    }
    await this.characterRepository.updateCharacterData(character.id, { ...data, scrubbedManaPotions: true })

    return { removed, goldRefunded }
  }

  /**
   * Habit streak helper (relocated from DiceService; same algorithm).
   */
  calculateHabitStreak(completions: { completedAt: Date }[]): number {
    return this.calculateStreakFromDates(completions.map((c) => c.completedAt))
  }

  calculateStreakFromDates(dates: Date[], timezoneOffset = 0): number {
    if (dates.length === 0) return 0

    const toLocalDay = (d: Date) => {
      const localTs = d.getTime() - timezoneOffset * 60 * 1000
      const localDate = new Date(localTs)
      return Date.UTC(localDate.getUTCFullYear(), localDate.getUTCMonth(), localDate.getUTCDate())
    }

    const sorted = [...dates].map(toLocalDay).sort((a, b) => b - a)
    const currentDate = toLocalDay(new Date())
    const diffDays = Math.floor((currentDate - sorted[0]) / (1000 * 60 * 60 * 24))
    if (diffDays > 1) return 0

    let streak = 1
    let prevDate = sorted[0]
    for (let i = 1; i < sorted.length; i++) {
      const dayDiff = Math.floor((prevDate - sorted[i]) / (1000 * 60 * 60 * 24))
      if (dayDiff === 1) {
        streak++
        prevDate = sorted[i]
      } else if (dayDiff === 0) {
        continue
      } else {
        break
      }
    }
    return streak
  }

  private amountFor(source: ManaSource, ctx: ManaGrantContext): number {
    if (source === 'task') return getTaskMana(ctx.impact)
    if (source === 'habit') return MANA_REWARDS.HABIT
    if (source === 'objective') return MANA_REWARDS.OBJECTIVE
    if (source === 'journal') return MANA_REWARDS.JOURNAL
    return 0
  }
}
