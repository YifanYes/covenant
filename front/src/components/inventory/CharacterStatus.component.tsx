import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Coins, Heart, Sparkles, Swords } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface CharacterStatusProps {
  status: {
    health: number
    mana: number
    gold: number
    diceBank: number
    maxDice: number
  } | null
}

export default function CharacterStatus({ status }: CharacterStatusProps) {
  const { t } = useTranslation()

  if (!status) return null

  return (
    <Card className='col-span-1 border-2'>
      <CardHeader className='flex flex-row items-center justify-between pb-2'>
        <CardTitle className='text-sm font-medium'>{t('inventory.stats')}</CardTitle>
        <Swords className='text-muted-foreground h-4 w-4' />
      </CardHeader>
      <CardContent className='grid gap-4'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Heart className='h-4 w-4 text-red-500' />
            <span className='text-sm font-medium'>{t('inventory.health')}</span>
          </div>
          <span className='text-sm font-bold text-red-500'>{status.health}</span>
        </div>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Sparkles className='h-4 w-4 text-blue-500' />
            <span className='text-sm font-medium'>{t('inventory.mana')}</span>
          </div>
          <span className='text-sm font-bold text-blue-500'>{status.mana}</span>
        </div>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <Coins className='h-4 w-4 text-yellow-500' />
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
