'use client'
import AbilityPanel from '@/components/ability-panel.component'
import OnboardingRedirect from '@/components/shared/onboarding-redirect'
import Tabs, { TabsContent, TabsList, TabsTrigger } from '@/ui/tabs.component'
import { queryClient, trpcOptions } from '@/utils/trpc.utils'
import { SlotType, type InventoryCharacter, type InventoryItem } from '@shared/types/gamification.types'
import { useMutation, useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import ArmoryTab from './_components/armory-tab.component'
import CharacterTab from './_components/character-tab.component'
import KillRecordTab from './_components/kill-record-tab.component'

export default function Inventory() {
  const { t } = useTranslation()
  const { data: characterData } = useSuspenseQuery(trpcOptions.character.getCurrentClass.queryOptions())

  const equipMutation = useMutation({
    ...trpcOptions.character.equipItem.mutationOptions(),
    onSuccess: () => {
      toast.success(t('inventory.success.equip'))
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
    },
    onError: () => {
      toast.error(t('inventory.error.equip'))
    }
  })

  const unequipMutation = useMutation({
    ...trpcOptions.character.unequipItem.mutationOptions(),
    onSuccess: () => {
      toast.success(t('inventory.success.unequip'))
      queryClient.invalidateQueries({ queryKey: trpcOptions.character.getCurrentClass.queryKey() })
    },
    onError: () => {
      toast.error(t('inventory.error.unequip'))
    }
  })

  if (!characterData) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <OnboardingRedirect />
      </div>
    )
  }

  const character = characterData as unknown as InventoryCharacter

  const handleEquipItem = (item: InventoryItem) => {
    equipMutation.mutate({ itemId: item.id })
  }

  const handleUnequipItem = (slotType: SlotType) => {
    unequipMutation.mutate({ slotType })
  }

  return (
    <div className="flex h-full w-full flex-col gap-4 overflow-hidden p-4">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-2xl font-bold text-white">{t('inventory.title')}</h1>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="character" className="flex min-h-0 flex-1 flex-col">
        <TabsList className="shrink-0">
          <TabsTrigger value="character">{t('inventory.tabs.character')}</TabsTrigger>
          <TabsTrigger value="armory">{t('inventory.tabs.armory')}</TabsTrigger>
          <TabsTrigger value="abilities">{t('inventory.tabs.abilities')}</TabsTrigger>
          <TabsTrigger value="kill_record">{t('inventory.tabs.kill_record')}</TabsTrigger>
        </TabsList>

        <TabsContent value="character" className="mt-4 flex-1 overflow-auto">
          <CharacterTab character={character} />
        </TabsContent>

        <TabsContent value="armory" className="mt-4 flex-1 overflow-auto">
          <ArmoryTab character={character} onEquipItem={handleEquipItem} onUnequipItem={handleUnequipItem} />
        </TabsContent>

        <TabsContent value="abilities" className="mt-4 flex-1 overflow-auto">
          <AbilityPanel showEquipControls />
        </TabsContent>

        <TabsContent value="kill_record" className="mt-4 flex-1 overflow-auto">
          <KillRecordTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
