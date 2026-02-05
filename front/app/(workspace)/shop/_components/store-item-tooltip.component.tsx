'use client'
import ItemStatsDisplay from '@/components/common/item-stats-display.component'
import Tooltip, { TooltipContent, TooltipTrigger } from '@/ui/tooltip.component'
import type { ItemDefinition } from '@shared/constants/items'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

interface StoreItemTooltipProps {
  item: ItemDefinition
  children: React.ReactNode
  isTierRestricted?: boolean
  characterTier?: number
}

export default function StoreItemTooltip({
  item,
  children,
  isTierRestricted = false,
  characterTier = 1
}: StoreItemTooltipProps) {
  const { t } = useTranslation()

  const itemName = t(item.nameKey)
  const itemDescription = t(item.descriptionKey)
  const itemImagePath = `/assets/items/${item.id}.png`

  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className='max-w-xs border-zinc-700 bg-zinc-800 p-3'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <Image src={itemImagePath} alt={itemName} width={32} height={32} className='h-8 w-8 object-contain' />
            <span className='font-semibold text-zinc-100'>{itemName}</span>
          </div>
          {itemDescription && <p className='text-xs text-zinc-400'>{itemDescription}</p>}
          {isTierRestricted && (
            <div className='rounded bg-red-900/30 px-2 py-1 text-xs text-red-400'>
              {t('store.tier_required', { tier: item.tier, current: characterTier })}
            </div>
          )}
          <div className='border-t border-zinc-700 pt-2'>
            <ItemStatsDisplay stats={item.stats} />
          </div>
          <div className='flex items-center justify-between text-xs'>
            <span className='text-zinc-400'>Tier {item.tier}</span>
            <span className='font-medium text-zinc-500 italic'>{t('store.random_rarity')}</span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
