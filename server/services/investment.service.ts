import { getInvestmentById } from '@shared/constants/investments'
import type { ContributeResult, InvestmentWithProgress } from '@shared/types/investment.types'
import { InvestmentStatus } from '@shared/types/investment.types'
import { TRPCError } from '@trpc/server'
import type { CharacterRepository } from '../repositories/character.repository'
import type { InvestmentRepository } from '../repositories/investment.repository'

export class InvestmentService {
  constructor(
    private investmentRepository: InvestmentRepository,
    private characterRepository: CharacterRepository
  ) {}

  async getInvestments(characterId: string): Promise<InvestmentWithProgress[]> {
    const character = await this.characterRepository.findByIdWithClasses(characterId)
    if (!character) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Character ${characterId} not found`
      })
    }

    const contributions = await this.investmentRepository.getContributionsByCharacter(characterId)

    const characterContributions = contributions.reduce(
      (acc, c) => {
        acc[c.investmentId] = (acc[c.investmentId] || 0) + c.amount
        return acc
      },
      {} as Record<string, number>
    )

    const investments = await this.investmentRepository.findByFaction(character.factionName)

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
    const character = await this.characterRepository.findByIdWithClasses(characterId)
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

    const investment = await this.investmentRepository.findById(investmentId)
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

    const result = await this.investmentRepository.contribute(
      investmentId,
      characterId,
      amount,
      character.gold
    )

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

    const totalCharacters = await this.investmentRepository.countCharacters()
    const playerCount = Math.max(1, totalCharacters)
    return template.baseTarget + playerCount * template.scaleFactor
  }
}
