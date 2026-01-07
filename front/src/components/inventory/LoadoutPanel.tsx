import { SlotType, type InventoryItem } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import EquipmentSlot from './EquipmentSlot'

interface LoadoutPanelProps {
  weapon?: InventoryItem
  armor?: InventoryItem
  accessory?: InventoryItem
  onUnequipWeapon?: () => void
  onUnequipArmor?: () => void
  onUnequipAccessory?: () => void
}

export default function LoadoutPanel({
  weapon,
  armor,
  accessory,
  onUnequipWeapon,
  onUnequipArmor,
  onUnequipAccessory
}: LoadoutPanelProps) {
  const { t } = useTranslation()

  return (
    <div className='flex flex-col gap-3'>
      <h3 className='text-sm font-semibold'>{t('inventory.loadout')}</h3>
      <div className='flex flex-wrap justify-center gap-4'>
        <EquipmentSlot type={SlotType.WEAPON} item={weapon} onUnequip={onUnequipWeapon} />
        <EquipmentSlot type={SlotType.ARMOR} item={armor} onUnequip={onUnequipArmor} />
        <EquipmentSlot type={SlotType.ACCESSORY} item={accessory} onUnequip={onUnequipAccessory} />
      </div>
    </div>
  )
}
