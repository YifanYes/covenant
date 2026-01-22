import DoctrinePanel from '@/components/doctrine-panel.component'
import OnboardingRedirect from '@/components/shared/onboarding-redirect'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { SlotType, type InventoryCharacter, type InventoryItem } from '@shared/types/gamification.types'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import CharacterPreview from './components/character-preview.component'
import CharacterStatus from './components/character-status.component'
import InventoryGrid from './components/inventory-grid.component'
import LoadoutPanel from './components/loadout-panel.component'

export default function AdventureInventory() {
  const { t } = useTranslation()
  const { data: characterData } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())

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

  if (!characterData) {
    return <OnboardingRedirect />
  }

  const character = characterData as InventoryCharacter

  const handleEquipItem = (item: InventoryItem) => {
    equipMutation.mutate({ itemId: item.id })
  }

  const handleUnequipItem = (slotType: SlotType) => {
    unequipMutation.mutate({ slotType })
  }

  return (
    <div className='flex h-full w-full flex-col gap-6 overflow-auto pr-4'>
      <div className='grid shrink-0 grid-cols-1 gap-6 lg:grid-cols-[2fr_2fr_2fr]'>
        <CharacterPreview character={character} />
        <LoadoutPanel character={character} onUnequip={handleUnequipItem} />
        <CharacterStatus character={character} />
      </div>
      <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
        <InventoryGrid character={character} onItemClick={handleEquipItem} />
        <DoctrinePanel showEquipControls />
      </div>
    </div>
  )
}
