'use client'
import LoaderButton from '@/components/common/loader-button.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { Heart } from '@nsmr/pixelart-react'
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function CharacterDeathOverlay() {
  const { t } = useTranslation()
  const [randomQuote] = useState(() => {
    const divineQuotes = t('inventory.divine_quotes', { returnObjects: true }) as string[]
    return divineQuotes[Math.floor(Math.random() * divineQuotes.length)]
  })

  const reviveMutation = useMutation({
    ...trpc.character.revive.mutationOptions(),
    onSuccess: () => {
      toast.success(t('inventory.success.revive'))
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
    },
    onError: () => {
      toast.error(t('inventory.error.revive'))
    }
  })

  return (
    <div className='bg-background/40 absolute inset-0 z-50 flex flex-col items-center justify-center gap-8 p-4 backdrop-blur-[2px] backdrop-grayscale-[0.5]'>
      <svg
        viewBox='0 0 24 24'
        fill='currentColor'
        className='text-destructive h-24 w-24 drop-shadow-[0_0_4px_rgba(220,38,38,0.4)]'
        xmlns='http://www.w3.org/2000/svg'
        style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}
      >
        {/* Main Cross Shafts (Thinner 1.5px/2px feel but highly detailed) */}
        <rect x='11' y='2' width='2' height='20' /> {/* Vertical */}
        <rect x='5' y='8' width='14' height='2' /> {/* Horizontal */}
        {/* Pointed Tips & Details (The "Arrowheads") */}
        <rect x='11' y='0' width='2' height='1' /> <rect x='10' y='1' width='4' height='1' /> {/* Top Point */}
        <rect x='11' y='23' width='2' height='1' /> <rect x='10' y='22' width='4' height='1' /> {/* Bottom Point */}
        <rect x='4' y='8' width='1' height='2' /> <rect x='5' y='7' width='1' height='4' /> {/* Left Point */}
        <rect x='19' y='8' width='1' height='2' /> <rect x='18' y='7' width='1' height='4' /> {/* Right Point */}
        {/* Symmetrical Halo Ring (Refined 1px thin) */}
        <rect x='10' y='6' width='4' height='1' /> {/* Top */}
        <rect x='10' y='11' width='4' height='1' /> {/* Bottom */}
        <rect x='7' y='8' width='1' height='2' /> {/* Left */}
        <rect x='16' y='8' width='1' height='2' /> {/* Right */}
        <rect x='8' y='7' width='1' height='1' /> <rect x='15' y='7' width='1' height='1' /> {/* Corners Top */}
        <rect x='8' y='10' width='1' height='1' /> <rect x='15' y='10' width='1' height='1' />{' '}
        {/* Radiant Spikes (Cardinal) */}
        <rect x='11' y='4' width='2' height='1' /> {/* Up */}
        <rect x='11' y='13' width='2' height='1' /> {/* Down */}
        <rect x='6' y='8' width='1' height='2' /> {/* Left (part of halo) */}
        <rect x='17' y='8' width='1' height='2' /> {/* Right (part of halo) */}
        {/* Diagonal Spikes (1px detail) */}
        <rect x='7' y='4' width='1' height='1' />
        {/* TL */}
        <rect x='16' y='4' width='1' height='1' />
        {/* TR */}
        <rect x='7' y='13' width='1' height='1' />
        {/* BL */}
        <rect x='16' y='13' width='1' height='1' />
        {/* BR */}
      </svg>

      <div className='flex flex-col items-center gap-6 text-center'>
        <p className='text-foreground text-md max-w-[90%] font-serif italic transition-all duration-700 text-shadow-[0_0_12px_rgba(255,255,255,0.2),0_0_4px_rgba(255,255,255,0.8)]'>
          {randomQuote}
        </p>

        <LoaderButton
          className='bg-destructive/90 text-background hover:bg-destructive gap-2 shadow-xl transition-all hover:scale-105 hover:animate-pulse active:scale-95 disabled:opacity-50'
          onClick={() => reviveMutation.mutate()}
          disabled={reviveMutation.isPending}
          isLoading={reviveMutation.isPending}
          label={t('inventory.revive')}
          icon={<Heart className='h-4 w-4' />}
        />
      </div>
    </div>
  )
}
