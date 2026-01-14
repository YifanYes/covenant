import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { ItemDefinition } from '@shared/constants/items'
import { ItemRarity } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'

interface StoreItemTooltipProps {
  item: ItemDefinition
  children: React.ReactNode
  isTierRestricted: boolean
  characterTier: number
}

export default function StoreItemTooltip({ item, children, isTierRestricted, characterTier }: StoreItemTooltipProps) {
  const { t } = useTranslation()

  const itemName = t(`items.${item.id}.name`, { defaultValue: item.name })
  const itemDescription = t(`items.${item.id}.description`, { defaultValue: item.description })
  const itemImagePath = `/assets/items/${item.id}.png`

  const rarityColor =
    item.rarity === ItemRarity.LEGENDARY
      ? 'text-yellow-400'
      : item.rarity === ItemRarity.RARE
        ? 'text-purple-400'
        : 'text-zinc-400'

  return (
    <Tooltip delayDuration={500}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className='max-w-xs border-zinc-700 bg-zinc-800 p-3'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <img src={itemImagePath} alt={itemName} className='h-8 w-8 object-contain' />
            <span className='font-semibold text-zinc-100'>{itemName}</span>
          </div>
          {itemDescription && <p className='text-xs text-zinc-400'>{itemDescription}</p>}
          {isTierRestricted && (
            <div className='rounded bg-red-900/30 px-2 py-1 text-xs text-red-400'>
              {t('store.tier_required', { tier: item.tier, current: characterTier })}
            </div>
          )}
          <div className='border-t border-zinc-700 pt-2'>
            <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs'>
              {item.stats.attackDice && (
                <div className='flex gap-1'>
                  <span className='text-zinc-400'>{t('inventory.stats.attack_dice')}</span>
                  <span className='font-medium text-red-400'>{item.stats.attackDice}</span>
                </div>
              )}
              {item.stats.damageType && (
                <div className='flex gap-1'>
                  <span className='text-zinc-400'>{t('inventory.stats.damage_type')}</span>
                  <span className='font-medium text-zinc-200'>
                    {t(`inventory.damage_type.${item.stats.damageType}`)}
                  </span>
                </div>
              )}
              {item.stats.physicalDefDice && (
                <div className='flex gap-1'>
                  <span className='text-zinc-400'>{t('inventory.stats.phys_def')}</span>
                  <span className='font-medium text-orange-400'>{item.stats.physicalDefDice}</span>
                </div>
              )}
              {item.stats.magicDefDice && (
                <div className='flex gap-1'>
                  <span className='text-zinc-400'>{t('inventory.stats.magic_def')}</span>
                  <span className='font-medium text-blue-400'>{item.stats.magicDefDice}</span>
                </div>
              )}
            </div>
          </div>
          <div className='flex items-center justify-between text-xs'>
            <span className='text-zinc-400'>Tier {item.tier}</span>
            <span className={`font-medium ${rarityColor}`}>
              {t(`item_categories.rarity.${item.rarity.toLowerCase()}`)}
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
