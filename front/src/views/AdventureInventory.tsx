import CharacterPreview from '@/components/inventory/CharacterPreview.component'
import CharacterStatus from '@/components/inventory/CharacterStatus.component'
import InventoryGrid from '@/components/inventory/InventoryGrid'
import LoadoutPanel from '@/components/inventory/LoadoutPanel'
import { trpc } from '@/utils/trpc.utils'
import type { InventoryCharacter } from '@shared/types/gamification.types'
import { useSuspenseQuery } from '@tanstack/react-query'

export default function AdventureInventory() {
  const { data: characterData } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())
  const character = characterData as InventoryCharacter

  return (
    <div className='flex h-full w-full flex-col gap-6 overflow-hidden'>
      <div className='grid shrink-0 grid-cols-1 gap-6 lg:grid-cols-[2fr_2fr_2fr]'>
        <CharacterPreview character={character} />
        <LoadoutPanel character={character} />
        <CharacterStatus character={character} />
      </div>
      <InventoryGrid character={character} />
    </div>
  )
}
