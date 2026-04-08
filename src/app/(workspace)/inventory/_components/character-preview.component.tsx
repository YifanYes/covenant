'use client'
import Card, { CardContent } from '@/ui/card.component'
import type { InventoryCharacter } from '@shared/types/gamification.types'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import MagicNatureBadge from './magic-nature-badge.component'

interface CharacterPreviewProps {
  character: InventoryCharacter
}

export default function CharacterPreview({ character }: CharacterPreviewProps) {
  const { t } = useTranslation()

  return (
    <Card className='flex min-h-0 w-full flex-1 flex-col gap-0'>
      <CardContent className='flex h-full flex-col items-center justify-center p-6'>
        <div className='relative flex h-56 w-56 items-center justify-center'>
          <Image
            src={`/assets/classes/${character.currentClass!}.png`}
            alt={character.currentClass!}
            width={224}
            height={224}
            priority
            className='pixelated h-full w-full object-contain'
            style={{ imageRendering: 'pixelated' }}
          />
        </div>
        <div className='flex flex-col items-center gap-1 text-center'>
          <h3 className='text-2xl font-bold'>
            {character.title ? `${character.name}, ${character.title}` : character.name}
          </h3>
          <div className='flex items-center justify-center gap-2'>
            <span className='text-muted-foreground font-medium capitalize'>
              {t(`character_class.${character.currentClass}`)}
            </span>
            <span className='text-primary bg-primary/10 rounded-full px-2 py-0.5 text-xs font-bold uppercase'>
              {t('inventory.tier')} {character.tier}
            </span>
            {character.magicNature && <MagicNatureBadge magicNature={character.magicNature} />}
          </div>
          <span className='text-muted-foreground text-sm'>{t(`factions.${character.factionName}`)}</span>
        </div>
      </CardContent>
    </Card>
  )
}
