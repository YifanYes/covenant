import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { ItemRarity, type InventoryItem } from '@shared/types/gamification.types'
import { Crosshair, Gem, Shield, Sword, Wand2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface ItemTooltipProps {
  item: InventoryItem
  children: React.ReactNode
}

const typeIcons = {
  WEAPON_MELEE: Sword,
  WEAPON_RANGED: Crosshair,
  WEAPON_MAGIC: Wand2,
  ARMOR: Shield,
  ACCESSORY: Gem
}

export default function ItemTooltip({ item, children }: ItemTooltipProps) {
  const { t } = useTranslation()
  const Icon = typeIcons[item.type]

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className='max-w-xs p-3'>
        <div className='flex flex-col gap-2'>
          <div className='flex items-center gap-2'>
            <Icon className='h-4 w-4' />
            <span className='font-semibold'>{item.name}</span>
          </div>
          {item.description && <p className='text-muted-foreground text-xs'>{item.description}</p>}
          <div className='border-t pt-2'>
            <div className='grid grid-cols-2 gap-1 text-xs'>
              {item.stats.attackDice && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{t('inventory.stats.attack_dice')}</span>
                  <span className='font-medium text-red-400'>{item.stats.attackDice}</span>
                </div>
              )}
              {item.stats.physicalDefDice && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{t('inventory.stats.phys_def')}</span>
                  <span className='font-medium text-orange-400'>{item.stats.physicalDefDice}</span>
                </div>
              )}
              {item.stats.magicDefDice && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{t('inventory.stats.magic_def')}</span>
                  <span className='font-medium text-blue-400'>{item.stats.magicDefDice}</span>
                </div>
              )}
              {item.stats.speed && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{t('inventory.stats.speed')}</span>
                  <span className='font-medium'>{item.stats.speed}</span>
                </div>
              )}
              {item.stats.range && (
                <div className='flex justify-between'>
                  <span className='text-muted-foreground'>{t('inventory.stats.range')}</span>
                  <span className='font-medium'>{item.stats.range}</span>
                </div>
              )}
            </div>
          </div>
          <div className='flex items-center justify-between text-xs'>
            <span className='text-muted-foreground'>Tier {item.tier}</span>
            <span
              className={`font-medium ${item.rarity === ItemRarity.LEGENDARY ? 'text-yellow-400' : item.rarity === ItemRarity.RARE ? 'text-purple-400' : 'text-gray-400'}`}
            >
              {t(`inventory.rarity.${item.rarity.toLowerCase()}`)}
            </span>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  )
}
