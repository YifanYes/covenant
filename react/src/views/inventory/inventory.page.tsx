import DoctrinePanel from '@/components/doctrine-panel.component'
import OnboardingRedirect from '@/components/shared/onboarding-redirect'
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.component'
import { queryClient, trpc } from '@/utils/trpc.utils'
import { SlotType, type InventoryCharacter, type InventoryItem } from '@shared/types/gamification.types'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import ArmoryTab from './components/armory-tab.component'
import CharacterTab from './components/character-tab.component'

export default function Inventory() {
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
    <div className='flex h-full w-full flex-col gap-4 overflow-hidden p-4'>
      {/* Header */}
      <div className='shrink-0'>
        <h1 className='text-2xl font-bold text-white'>{t('inventory.title')}</h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue='character' className='flex min-h-0 flex-1 flex-col'>
        <TabsList className='shrink-0'>
          <TabsTrigger value='character'>{t('inventory.tabs.character')}</TabsTrigger>
          <TabsTrigger value='armory'>{t('inventory.tabs.armory')}</TabsTrigger>
          <TabsTrigger value='doctrines'>{t('inventory.tabs.doctrines')}</TabsTrigger>
        </TabsList>

        <TabsContent value='character' className='mt-4 flex-1 overflow-auto'>
          <CharacterTab character={character} />
        </TabsContent>

        <TabsContent value='armory' className='mt-4 flex-1 overflow-auto'>
          <ArmoryTab character={character} onEquipItem={handleEquipItem} onUnequipItem={handleUnequipItem} />
        </TabsContent>

        <TabsContent value='doctrines' className='mt-4 flex-1 overflow-auto'>
          <DoctrinePanel showEquipControls />
        </TabsContent>
      </Tabs>
    </div>
  )
}
