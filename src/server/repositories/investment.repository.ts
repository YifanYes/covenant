import { InvestmentStatus } from '@shared/types/investment.types'
import type { Investment, PrismaClient } from '@/generated/prisma'

export class InvestmentRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(investmentId: string): Promise<Investment | null> {
    return this.prisma.investment.findUnique({
      where: { id: investmentId }
    })
  }

  async findByFaction(factionName: string): Promise<Investment[]> {
    return this.prisma.investment.findMany({
      where: { factionName }
    })
  }

  async getContributionsByCharacter(characterId: string): Promise<{ investmentId: string; amount: number }[]> {
    return this.prisma.investmentContribution.findMany({
      where: { characterId },
      select: { investmentId: true, amount: true }
    })
  }

  async contribute(
    investmentId: string,
    characterId: string,
    amount: number,
    currentGold: number
  ): Promise<{ newTotal: number; characterGold: number; investmentCompleted: boolean }> {
    return this.prisma.$transaction(async (tx) => {
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
        characterGold: currentGold - amount,
        investmentCompleted: isCompleted
      }
    })
  }

  async countCharacters(): Promise<number> {
    return this.prisma.character.count()
  }

  async findExpiredInvestments(before: Date): Promise<Investment[]> {
    return this.prisma.investment.findMany({
      where: {
        status: InvestmentStatus.ACTIVE,
        deadline: { lt: before }
      }
    })
  }

  async failInvestment(investmentId: string): Promise<Investment> {
    return this.prisma.investment.update({
      where: { id: investmentId },
      data: {
        status: InvestmentStatus.FAILED,
        completedAt: new Date()
      }
    })
  }
}
