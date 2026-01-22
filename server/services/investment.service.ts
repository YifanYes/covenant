import { getInvestmentById } from '@shared/constants/investments'
import { ContributeResult, InvestmentStatus, InvestmentWithProgress } from '@shared/types/investment.types'
import { TRPCError } from '@trpc/server'
import type { PrismaClient } from '../generated/prisma'

export class InvestmentService {
  constructor(private prisma: PrismaClient) {}

  async getInvestments(characterId: string): Promise<InvestmentWithProgress[]> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId }
    })
    if (!character) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Character ${characterId} not found`
      })
    }

    const contributions = await this.prisma.investmentContribution.findMany({
      where: { characterId },
      select: { investmentId: true, amount: true }
    })

    const characterContributions = contributions.reduce(
      (acc, c) => {
        acc[c.investmentId] = (acc[c.investmentId] || 0) + c.amount
        return acc
      },
      {} as Record<string, number>
    )

    const investments = await this.prisma.investment.findMany({
      where: { factionName: character.factionName }
    })

    return investments.map((inv) => {
      const template = getInvestmentById(inv.investmentId)
      return {
        id: inv.id,
        investmentId: inv.investmentId,
        factionName: inv.factionName,
        status: inv.status as InvestmentStatus,
        currentAmount: inv.currentAmount,
        targetAmount: inv.targetAmount,
        deadline: inv.deadline,
        nameKey: template?.nameKey || inv.investmentId,
        descriptionKey: template?.descriptionKey || '',
        percentComplete: Math.min(100, Math.round((inv.currentAmount / inv.targetAmount) * 100)),
        myContribution: characterContributions[inv.id] || 0
      }
    })
  }

  async contribute(investmentId: string, characterId: string, amount: number): Promise<ContributeResult> {
    const character = await this.prisma.character.findUnique({
      where: { id: characterId }
    })
    if (!character) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Character ${characterId} not found`
      })
    }

    if (character.gold < amount) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Not enough gold'
      })
    }

    const investment = await this.prisma.investment.findUnique({
      where: { id: investmentId }
    })
    if (!investment) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Investment ${investmentId} not found`
      })
    }

    if (investment.status !== InvestmentStatus.ACTIVE) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Investment is no longer active'
      })
    }

    if (investment.factionName !== character.factionName) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Cannot contribute to another faction investment'
      })
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: characterId },
        data: { gold: { decrement: amount } }
      })

      await tx.investmentContribution.create({
        data: {
          investmentId,
          characterId,
          amount
        }
      })

      const updatedInvestment = await tx.investment.update({
        where: { id: investmentId },
        data: { currentAmount: { increment: amount } }
      })

      const isCompleted = updatedInvestment.currentAmount >= updatedInvestment.targetAmount

      if (isCompleted) {
        await tx.investment.update({
          where: { id: investmentId },
          data: {
            status: InvestmentStatus.COMPLETED,
            completedAt: new Date()
          }
        })
      }

      return {
        newTotal: updatedInvestment.currentAmount,
        characterGold: character.gold - amount,
        investmentCompleted: isCompleted
      }
    })

    return {
      success: true,
      ...result
    }
  }

  async calculateTarget(investmentId: string): Promise<number> {
    const template = getInvestmentById(investmentId)
    if (!template) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Investment template ${investmentId} not found`
      })
    }

    const totalCharacters = await this.prisma.character.count()
    const playerCount = Math.max(1, totalCharacters)
    return template.baseTarget + playerCount * template.scaleFactor
  }
}
