import { Luggage } from '@nsmr/pixelart-react'
import type { InventoryCharacter } from '@shared/types/gamification.types'
import { SlotType } from '@shared/types/gamification.types'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card'
import EquipmentSlot from './EquipmentSlot'

interface LoadoutPanelProps {
  character: InventoryCharacter
  onUnequipWeapon?: () => void
  onUnequipArmor?: () => void
  onUnequipAccessory?: () => void
}

export default function LoadoutPanel({
  character,
  onUnequipWeapon,
  onUnequipArmor,
  onUnequipAccessory
}: LoadoutPanelProps) {
  const { t } = useTranslation()

  // Parse loadout items by type
  const loadoutItems = useMemo(
    () => ({
      weapon: character?.loadout?.find((item) => item.type.startsWith('WEAPON_')),
      armor: character?.loadout?.find((item) => item.type === 'ARMOR'),
      accessory: character?.loadout?.find((item) => item.type === 'ACCESSORY')
    }),
    [character?.loadout]
  )

  return (
    <Card className='flex min-h-0 w-full flex-1 flex-col gap-0'>
      <CardHeader className='flex shrink-0 flex-row items-center justify-between pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <Luggage className='h-4 w-4' />
          {t('inventory.loadout')}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex h-full flex-col justify-center pt-2'>
        <div className='flex h-full flex-row gap-3'>
          <div className='flex flex-1 flex-col items-center justify-center gap-4'>
            <EquipmentSlot type={SlotType.WEAPON} item={loadoutItems.weapon} onUnequip={onUnequipWeapon} />
            <EquipmentSlot type={SlotType.ARMOR} item={loadoutItems.armor} onUnequip={onUnequipArmor} />
            <EquipmentSlot type={SlotType.ACCESSORY} item={loadoutItems.accessory} onUnequip={onUnequipAccessory} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
