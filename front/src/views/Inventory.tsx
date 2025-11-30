import { default as AttributeCard, default as ClassAttributeCard } from '@/components/inventory/ClassAttributeCard'
import { trpc } from '@/utils/trpc.utils'
import { useSuspenseQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

export default function Inventory() {
  const { t } = useTranslation()
  const { data: character } = useSuspenseQuery(trpc.character.getCurrentClass.queryOptions())

  if (!character) {
    return null
  }

  const currentClass = character.classes.find((characterClass) => characterClass.className === character.currentClass)

  if (!currentClass) {
    return null
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
        </div>

        <div className='grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4'>
          <ClassAttributeCard label={t('inventory.level')} value={currentClass.level} />
          <ClassAttributeCard label={t('inventory.exp')} value={currentClass.exp} />
          <ClassAttributeCard label={t('inventory.health')} value={currentClass.health} />
          <ClassAttributeCard label={t('inventory.mana')} value={currentClass.mana} />
          <ClassAttributeCard
            label={t('inventory.strength')}
            value={currentClass.strength}
            labelClassName='text-red-300'
          />
          <ClassAttributeCard
            label={t('inventory.wisdom')}
            value={currentClass.wisdom}
            labelClassName='text-blue-300'
          />
          <AttributeCard
            label={t('inventory.resistance')}
            value={currentClass.resistance}
            labelClassName='text-green-300'
          />
          <AttributeCard label={t('inventory.faith')} value={currentClass.faith} labelClassName='text-white' />
        </div>
      </div>
    </div>
  )
}
