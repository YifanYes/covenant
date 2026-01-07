import CharacterStatus from '@/components/inventory/CharacterStatus.component'
import InventoryGrid from '@/components/inventory/InventoryGrid'
import LoadoutPanel from '@/components/inventory/LoadoutPanel'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { trpc } from '@/utils/trpc.utils'
import { Luggage, User } from '@nsmr/pixelart-react'
import type { InventoryItem } from '@shared/types/gamification.types'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export default function Inventory() {
  const { t } = useTranslation()
  const { data: character } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())

  // Parse loadout items by type
  const loadoutItems = useMemo(() => {
    const loadout = (character?.loadout || []) as InventoryItem[]
    return {
      weapon: loadout.find((item) => item.type.startsWith('WEAPON_')),
      armor: loadout.find((item) => item.type === 'ARMOR'),
      accessory: loadout.find((item) => item.type === 'ACCESSORY')
    }
  }, [character?.loadout])

  // Parse inventory items
  const inventoryItems = useMemo(() => {
    return (character?.inventory || []) as InventoryItem[]
  }, [character?.inventory])

  if (!character) {
    return (
      <div className='flex h-[calc(100vh-200px)] w-full flex-col items-center justify-center gap-4 p-4 text-center'>
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

  const currentClass = character.classes.find((characterClass) => characterClass.className === character.currentClass)!

  const statusValues = {
    level: currentClass.level,
    exp: currentClass.exp,
    maxExp: currentClass.level * 100,
    physAtk: currentClass.strengthAtk,
    physDef: currentClass.strengthDef,
    magicAtk: currentClass.magicAtk,
    magicDef: currentClass.magicDef,
    health: currentClass.health,
    mana: currentClass.mana,
    gold: character.gold,
    diceBank: character.data?.diceBank || 0,
    maxDice: character.maxDice || 10,
    manaRegen: currentClass.manaRegen
  }

  return (
    <div className='flex h-full w-full flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>{t('inventory.title')}</h1>
      </div>

      <div className='grid grid-cols-1 gap-6 lg:grid-cols-[350px_1fr]'>
        {/* Character Panel */}
        <div className='bg-card flex flex-col items-center gap-6 rounded-xl border p-6 shadow-sm'>
          <div className='relative flex h-40 w-40 items-center justify-center'>
            <img
              src={`/assets/${character.currentClass}.png`}
              alt={character.currentClass}
              className='pixelated h-full w-full object-contain'
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          <div className='flex flex-col items-center gap-1 text-center'>
            <h3 className='text-2xl font-bold'>
              {character.title ? `${character.name}, ${character.title}` : character.name}
            </h3>
            <div className='flex items-center gap-2'>
              <span className='text-muted-foreground font-medium capitalize'>
                {t(`character_class.${character.currentClass}`)}
              </span>
              <span className='text-primary bg-primary/10 rounded-full px-2 py-0.5 text-xs font-bold uppercase'>
                Tier {character.tier}
              </span>
            </div>
            {character.orderName && <span className='text-muted-foreground text-sm'>{character.orderName}</span>}
          </div>
        </div>

        {/* Stats Panel */}
        <CharacterStatus status={statusValues} />
      </div>

      {/* Loadout Section - Full Width */}
      <Card>
        <CardContent className='pt-6'>
          <LoadoutPanel weapon={loadoutItems.weapon} armor={loadoutItems.armor} accessory={loadoutItems.accessory} />
        </CardContent>
      </Card>

      {/* Armory Section - Full Width */}
      <Card className='w-full'>
        <CardHeader className='flex flex-row items-center justify-between pb-2'>
          <CardTitle className='flex items-center gap-2 text-sm font-medium tracking-wider uppercase'>
            <Luggage className='h-4 w-4' />
            {t('inventory.armory')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryGrid items={inventoryItems} />
        </CardContent>
      </Card>
    </div>
  )
}
