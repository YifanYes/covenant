'use client'
import type { InventoryCharacter } from '@shared/types/gamification.types'
import CharacterPreview from './character-preview.component'
import CharacterStatus from './character-status.component'

interface CharacterTabProps {
  character: InventoryCharacter
}

export default function CharacterTab({ character }: CharacterTabProps) {
  return (
    <div className='grid grid-cols-1 gap-6 lg:grid-cols-2'>
      <CharacterPreview character={character} />
      <CharacterStatus character={character} />
    </div>
  )
}
