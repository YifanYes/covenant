import CharacterPreview from '@/components/inventory/CharacterPreview.component'
import CharacterStatus from '@/components/inventory/CharacterStatus.component'
import InventoryGrid from '@/components/inventory/InventoryGrid'
import LoadoutPanel from '@/components/inventory/LoadoutPanel'
import { Button } from '@/components/ui/button'
import { trpc } from '@/utils/trpc.utils'
import { User } from '@nsmr/pixelart-react'
import type { InventoryCharacter } from '@shared/types/gamification.types'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export default function Inventory() {
  const { t } = useTranslation()
  const { data: characterData } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())
  const character = characterData as InventoryCharacter

  if (!character) {
    return (
      <div className='flex h-[calc(100vh-150px)] w-full flex-col items-center justify-center gap-4 p-4 text-center'>
        <div className='bg-primary/10 ring-primary/5 flex h-24 w-24 items-center justify-center rounded-full ring-8 transition-transform duration-300 hover:scale-110'>
          <User className='text-primary h-12 w-12' />
        </div>
        <div className='max-w-md space-y-2'>
          <h3 className='text-2xl font-bold tracking-tight'>{t('inventory.no_character.title')}</h3>
          <p className='text-muted-foreground text-lg leading-relaxed'>{t('inventory.no_character.description')}</p>
        </div>
        <Button
          size='sm'
          className='hover:shadow-primary/20 mt-2 px-5 py-4 font-semibold shadow-lg transition-all active:scale-95'
        >
          <Link to='/onboarding'>{t('inventory.no_character.button')}</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className='flex h-full w-full flex-col gap-6 overflow-hidden p-6'>
      <div className='flex shrink-0 items-center justify-between'>
        <h1 className='text-3xl font-bold'>{t('inventory.title')}</h1>
      </div>

      <div className='grid shrink-0 grid-cols-1 gap-6 lg:grid-cols-[2fr_2fr_2fr]'>
        <CharacterPreview character={character} />
        <LoadoutPanel character={character} />
        <CharacterStatus character={character} />
      </div>

      <InventoryGrid character={character} />
    </div>
  )
}
