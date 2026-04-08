'use client'
import { cn } from '@/lib/cn.lib'
import { Coin, Shield, Zap } from '@nsmr/pixelart-react'
import type { InventoryItem, SlotType } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import ItemCard from './item-card.component'

interface EquipmentSlotProps {
  type: SlotType
  item?: InventoryItem
  onUnequip?: () => void
}

const slotIcons = {
  WEAPON: Zap,
  ARMOR: Shield,
  ACCESSORY: Coin
}

export default function EquipmentSlot({ type, item, onUnequip }: EquipmentSlotProps) {
  const { t } = useTranslation()
  const Icon = slotIcons[type]

  if (item) {
    return (
      <div className='flex flex-col items-center gap-1'>
        <ItemCard item={item} onClick={onUnequip} />
        <span className='text-muted-foreground text-xs capitalize'>{t(`inventory.equipment_slot.${type}`)}</span>
      </div>
    )
  }

  return (
    <div className='flex flex-col items-center gap-1'>
      <div
        className={cn(
          'bg-muted/50 flex h-25 w-25 flex-col items-center justify-center rounded-lg border-2 border-dashed',
          'text-muted-foreground'
        )}
      >
        <Icon className='h-6 w-6 opacity-40' />
      </div>
      <span className='text-muted-foreground text-xs capitalize'>{t(`inventory.equipment_slot.${type}`)}</span>
    </div>
  )
}
