import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bullseye, Heart, Money, Shield, Trophy, Zap } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'

interface CharacterStatusProps {
  status: {
    level: number
    exp: number
    maxExp: number
    physAtk: number
    physDef: number
    magicAtk: number
    magicDef: number
    health: number
    mana: number
    gold: number
    diceBank: number
    maxDice: number
    manaRegen: number
  } | null
}

export default function CharacterStatus({ status }: CharacterStatusProps) {
  const { t } = useTranslation()

  if (!status) return null

  return (
    <Card className='border-2'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-sm font-medium'>{t('inventory.stats_title')}</CardTitle>
        <Trophy className='text-muted-foreground h-4 w-4' />
      </CardHeader>
      <CardContent className='flex flex-col gap-4'>
        {/* Basic Info */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Trophy className='h-4 w-4 text-yellow-500' />
            <span className='text-sm font-medium'>{t('inventory.level')}</span>
          </div>
          <span className='text-sm font-bold'>{status.level}</span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Bullseye className='h-4 w-4 text-orange-500' />
            <span className='text-sm font-medium'>{t('inventory.exp')}</span>
          </div>
          <span className='text-sm font-bold'>
            {status.exp} / {status.maxExp}
          </span>
        </div>

        <div className='my-1 border-t border-dashed' />

        {/* Combat Stats */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Shield className='h-4 w-4 text-red-500' />
            <span className='text-sm font-medium'>{t('inventory.phys')}</span>
          </div>
          <span className='text-sm font-bold text-red-500'>
            {status.physAtk} / {status.physDef}
          </span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Zap className='h-4 w-4 text-blue-500' />
            <span className='text-sm font-medium'>{t('inventory.magic')}</span>
          </div>
          <span className='text-sm font-bold text-blue-500'>
            {status.magicAtk} / {status.magicDef}
          </span>
        </div>

        <div className='my-1 border-t border-dashed' />

        {/* Survival Stats */}
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Heart className='h-4 w-4 text-red-500' />
            <span className='text-sm font-medium'>{t('inventory.health')}</span>
          </div>
          <span className='text-sm font-bold text-red-500'>{status.health}</span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Zap className='h-4 w-4 text-blue-500' />
            <span className='text-sm font-medium'>{t('inventory.mana')}</span>
          </div>
          <span className='text-sm font-bold text-blue-500'>{status.mana}</span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Zap className='h-4 w-4 text-blue-300' />
            <span className='text-sm font-medium'>{t('inventory.mana_regen')}</span>
          </div>
          <span className='text-sm font-bold text-blue-300'>{status.manaRegen}</span>
        </div>

        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Money className='h-4 w-4 text-yellow-500' />
            <span className='text-sm font-medium'>{t('inventory.gold')}</span>
          </div>
          <span className='text-sm font-bold text-yellow-500'>{status.gold}</span>
        </div>

        <div className='flex items-center justify-between border-t border-dashed pt-4'>
          <div className='flex items-center gap-2'>
            <div className='flex items-center justify-center rounded-md bg-purple-500/10 p-1'>
              <span className='text-[10px]'>🎲</span>
            </div>
            <span className='text-sm font-medium'>{t('inventory.dice_bank')}</span>
          </div>
          <span className='text-sm font-black text-purple-500'>
            {status.diceBank} / {status.maxDice}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
