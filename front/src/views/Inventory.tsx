import CharacterStatusComponent from '@/components/inventory/CharacterStatus.component'
import ClassAttributeCard from '@/components/inventory/ClassAttributeCard'
import { Button } from '@/components/ui/button'
import { trpc } from '@/utils/trpc.utils'
import { User } from '@nsmr/pixelart-react'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'

export default function Inventory() {
  const { t } = useTranslation()
  const { data: character } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())

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

  const characterData = character.data
  const statusValues = {
    health: currentClass.health,
    mana: currentClass.mana,
    gold: character.gold,
    diceBank: characterData?.diceBank || 0,
    maxDice: character.maxDice || 10
  }

  return (
    <div className='flex h-full w-full flex-col gap-6 p-6'>
      <div className='flex items-center justify-between'>
        <h1 className='text-3xl font-bold'>{t('inventory.title')}</h1>
      </div>

      <div className='grid grid-cols-1 gap-6 md:grid-cols-[350px_1fr]'>
        <div className='bg-card flex flex-col items-center justify-center gap-6 rounded-xl border p-8 shadow-sm'>
          <div className='relative flex h-48 w-48 items-center justify-center'>
            <img
              src={`/assets/${character.currentClass}.png`}
              alt={character.currentClass}
              className='pixelated h-full w-full object-contain'
              style={{ imageRendering: 'pixelated' }}
            />
          </div>

          <div className='flex flex-col items-center gap-2 text-center'>
            <h3 className='text-3xl'>{character.title ? `${character.name}, ${character.title}` : character.name}</h3>

            <div className='mt-4 flex flex-col gap-1'>
              <div className='flex items-center gap-2'>
                <span className='font-semibold capitalize'>{t(`character_class.${character.currentClass}`)}</span>
              </div>
              {character.orderName && (
                <div className='flex items-center gap-2'>
                  <span className='font-semibold'>{character.orderName}</span>
                </div>
              )}
            </div>
          </div>

          <div className='w-full'>
            <CharacterStatusComponent status={statusValues} />
          </div>
        </div>

        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
          <ClassAttributeCard label={t('inventory.level')} value={currentClass.level} />
          <ClassAttributeCard label={t('inventory.exp')} value={currentClass.exp} />
          <ClassAttributeCard
            label={t('inventory.strength_atk')}
            value={currentClass.strengthAtk}
            labelClassName='text-red-400'
          />
          <ClassAttributeCard
            label={t('inventory.strength_def')}
            value={currentClass.strengthDef}
            labelClassName='text-red-200'
          />
          <ClassAttributeCard
            label={t('inventory.magic_atk')}
            value={currentClass.magicAtk}
            labelClassName='text-blue-400'
          />
          <ClassAttributeCard
            label={t('inventory.magic_def')}
            value={currentClass.magicDef}
            labelClassName='text-blue-200'
          />
        </div>
      </div>
    </div>
  )
}
