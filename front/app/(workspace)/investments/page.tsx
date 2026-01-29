'use client'
import { queryClient, trpc, trpcOptions } from '@/utils/trpc.utils'
import { Coin } from '@nsmr/pixelart-react'
import type { InvestmentWithProgress } from '@shared/types/investment.types'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import ContributeToInvestmentDialog from './_components/contribute-dialog.component'
import InvestmentCard from './_components/investment-card.component'

export default function InvestmentsPage() {
  const { t } = useTranslation()
  const [selectedInvestment, setSelectedInvestment] = useState<InvestmentWithProgress | null>(null)

  const { data: character } = useSuspenseQuery(trpcOptions.character.get.queryOptions())
  const { data: investments } = useSuspenseQuery(
    trpcOptions.investment.list.queryOptions({ characterId: character?.id ?? '' }, { enabled: !!character?.id })
  )

  const contributeMutation = useMutation({
    ...trpcOptions.investment.contribute.mutationOptions(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: trpc.investment.list.queryKey({ characterId: character?.id ?? '' }) })
      queryClient.invalidateQueries({ queryKey: trpc.character.get.queryKey() })
      setSelectedInvestment(null)
    }
  })

  const handleContribute = async (amount: number) => {
    if (!selectedInvestment || !character) return

    try {
      await contributeMutation.mutateAsync({
        investmentId: selectedInvestment.id,
        characterId: character.id,
        amount
      })
      toast.success(t('investments.success_contribute'))
    } catch (error) {
      toast.error(t('investments.error_contribute'), {
        description: error instanceof Error ? error.message : undefined
      })
    }
  }

  return (
    <div className='flex h-full w-full flex-col gap-4 overflow-hidden p-4'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold text-white'>{t('investments.title')}</h1>
          <p className='text-sm text-slate-400'>{t('investments.subtitle')}</p>
        </div>
        {character && (
          <div className='flex items-center gap-2 rounded-lg px-4 py-2'>
            <span className='font-bold text-yellow-400'>{character.gold.toLocaleString()}</span>
            <Coin size={24} />
          </div>
        )}
      </div>

      {/* Investments Grid */}
      <div className='mx-auto grid w-full max-w-4xl flex-1 gap-4 overflow-auto md:grid-cols-2'>
        {investments?.map((investment) => (
          <InvestmentCard
            key={investment.id}
            investment={investment}
            onContribute={setSelectedInvestment}
            characterGold={character?.gold || 0}
          />
        ))}

        {investments?.length === 0 && (
          <div className='col-span-2 flex items-center justify-center text-slate-400'>
            {t('investments.no_investments')}
          </div>
        )}
      </div>

      {/* Contribute Dialog */}
      {selectedInvestment && character && (
        <ContributeToInvestmentDialog
          investment={selectedInvestment}
          characterGold={character.gold}
          open={!!selectedInvestment}
          onOpenChange={(open) => !open && setSelectedInvestment(null)}
          onContribute={handleContribute}
          isLoading={contributeMutation.isPending}
        />
      )}
    </div>
  )
}
