import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bullseye, Heart, Money, ScriptText, Shield, Trophy, Zap } from '@nsmr/pixelart-react'
import type { InventoryCharacter } from '@shared/types/gamification.types'
import { useTranslation } from 'react-i18next'
import { Separator } from '../ui/separator'

interface CharacterStatusProps {
  character: InventoryCharacter
}

export default function CharacterStatus({ character }: CharacterStatusProps) {
  const { t } = useTranslation()

  if (!character) return null

  const currentClass = character.classes.find((characterClass) => characterClass.className === character.currentClass)!

  if (!currentClass) return null

  return (
    <Card className='flex min-h-0 w-full flex-1 flex-col gap-0'>
      <CardHeader className='flex shrink-0 flex-row items-center justify-between pb-2'>
        <CardTitle className='flex items-center gap-2 text-sm font-medium'>
          <ScriptText className='h-4 w-4' />
          {t('inventory.stats_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className='flex h-full flex-col justify-center gap-2 pt-6'>
        {/* Basic Info */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Trophy className='h-4 w-4 text-yellow-500' />
            <span className='text-sm font-medium'>{t('inventory.level')}</span>
          </div>
          <span className='text-sm font-bold'>{currentClass.level}</span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Bullseye className='h-4 w-4 text-orange-500' />
            <span className='text-sm font-medium'>{t('inventory.exp')}</span>
          </div>
          <span className='text-sm font-bold'>
            {currentClass.exp} / {currentClass.level * 100}
          </span>
        </div>

        <Separator className='bg-sidebar-border my-1 w-auto' />

        {/* Combat Stats */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Shield className='h-4 w-4 text-red-500' />
            <span className='text-sm font-medium'>{t('inventory.phys')}</span>
          </div>
          <span className='text-sm font-bold text-red-500'>
            {currentClass.strengthAtk} / {currentClass.strengthDef}
          </span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Zap className='h-4 w-4 text-blue-500' />
            <span className='text-sm font-medium'>{t('inventory.magic')}</span>
          </div>
          <span className='text-sm font-bold text-blue-500'>
            {currentClass.magicAtk} / {currentClass.magicDef}
          </span>
        </div>

        <Separator className='bg-sidebar-border my-1 w-auto' />

        {/* Survival Stats */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Heart className='h-4 w-4 text-red-500' />
            <span className='text-sm font-medium'>{t('inventory.health')}</span>
          </div>
          <span className='text-sm font-bold text-red-500'>{currentClass.health}</span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Zap className='h-4 w-4 text-blue-500' />
            <span className='text-sm font-medium'>{t('inventory.mana')}</span>
          </div>
          <span className='text-sm font-bold text-blue-500'>{currentClass.mana}</span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Zap className='h-4 w-4 text-blue-300' />
            <span className='text-sm font-medium'>{t('inventory.mana_regen')}</span>
          </div>
          <span className='text-sm font-bold text-blue-300'>{currentClass.manaRegen}</span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Money className='h-4 w-4 text-yellow-500' />
            <span className='text-sm font-medium'>{t('inventory.gold')}</span>
          </div>
          <span className='text-sm font-bold text-yellow-500'>{character.gold}</span>
        </div>

        <Separator className='bg-sidebar-border my-1 w-auto' />

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className='flex items-center justify-center rounded-md bg-purple-500/10 p-1'>
              <span className='text-[10px]'>🎲</span>
            </div>
            <span className='text-sm font-medium'>{t('inventory.dice_bank')}</span>
          </div>
          <span className='text-sm font-black text-purple-500'>
            {character.data?.diceBank || 0} / {character.maxDice || 10}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
