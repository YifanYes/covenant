import CharacterPreview from '@/components/inventory/CharacterPreview.component'
import CharacterStatus from '@/components/inventory/CharacterStatus.component'
import InventoryGrid from '@/components/inventory/InventoryGrid'
import LoadoutPanel from '@/components/inventory/LoadoutPanel'
import { queryClient, trpc } from '@/utils/trpc.utils'
import type { InventoryCharacter, InventoryItem } from '@shared/types/gamification.types'
import { SlotType } from '@shared/types/gamification.types'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

export default function AdventureInventory() {
  const { t } = useTranslation()
  const { data: characterData } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())
  const character = characterData as InventoryCharacter

  const equipMutation = useMutation({
    ...trpc.character.equipItem.mutationOptions(),
    onSuccess: () => {
      toast.success(t('inventory.success.equip'))
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
    },
    onError: () => {
      toast.error(t('inventory.error.equip'))
    }
  })

  const unequipMutation = useMutation({
    ...trpc.character.unequipItem.mutationOptions(),
    onSuccess: () => {
      toast.success(t('inventory.success.unequip'))
      queryClient.invalidateQueries({ queryKey: trpc.character.getCurrentClass.queryKey() })
    },
    onError: () => {
      toast.error(t('inventory.error.unequip'))
    }
  })

  const handleEquipItem = (item: InventoryItem) => {
    equipMutation.mutate({ itemId: item.id })
  }

  const handleUnequipItem = (slotType: SlotType) => {
    unequipMutation.mutate({ slotType })
  }

  return (
    <div className='flex h-full w-full flex-col gap-6 overflow-hidden'>
      <div className='grid shrink-0 grid-cols-1 gap-6 lg:grid-cols-[2fr_2fr_2fr]'>
        <CharacterPreview character={character} />
        <LoadoutPanel character={character} onUnequip={handleUnequipItem} />
        <CharacterStatus character={character} />
      </div>
      <InventoryGrid character={character} onItemClick={handleEquipItem} />
    </div>
  )
}
