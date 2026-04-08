'use client'
import ItemStatsDisplay from '@/components/common/item-stats-display.component'
import Tooltip, { TooltipContent, TooltipTrigger } from '@/ui/tooltip.component'
import { ItemRarity, type InventoryItem } from '@shared/types/gamification.types'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'

interface ItemTooltipProps {
  item: InventoryItem
  quantity?: number
  children: React.ReactNode
}

export default function ItemTooltip({ item, quantity = 1, children }: ItemTooltipProps) {
  const { t } = useTranslation()

  const itemName = t(item.nameKey)
  const itemDescription = item.descriptionKey ? t(item.descriptionKey) : ''
  const itemImagePath = `/assets/items/${item.definitionId}.png`

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className='max-w-xs border-zinc-700 bg-zinc-800 p-3'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <Image src={itemImagePath} alt={itemName} width={32} height={32} className='h-8 w-8 object-contain' />
            <div className='flex flex-col'>
              <span className='font-semibold text-zinc-100'>{itemName}</span>
              {quantity > 1 && <span className='text-[10px] text-zinc-400'>Quantity: {quantity}</span>}
            </div>
          </div>
          {itemDescription && <p className='text-xs text-zinc-400'>{itemDescription}</p>}
          <div className='border-t border-zinc-700 pt-2'>
            <ItemStatsDisplay stats={item.stats} />
          </div>
          <div className='flex items-center justify-between text-xs'>
            <span className='text-zinc-400'>Tier {item.tier}</span>
            <span
              className={`font-medium ${item.rarity === ItemRarity.LEGENDARY ? 'text-yellow-400' : item.rarity === ItemRarity.RARE ? 'text-purple-400' : 'text-zinc-400'}`}
            >
              {t(`inventory.rarity.${item.rarity.toLowerCase()}`)}
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
