'use client'
import type { ItemStats } from '@shared/constants/items'
import { useTranslation } from 'react-i18next'

interface ItemStatsDisplayProps {
  stats: ItemStats
}

export default function ItemStatsDisplay({ stats }: ItemStatsDisplayProps) {
  const { t } = useTranslation()

  return (
    <div className='flex flex-wrap gap-x-4 gap-y-1 text-xs'>
      {stats.attackDice && (
        <div className='flex gap-1'>
          <span className='text-zinc-400'>{t('inventory.stats.attack_dice')}</span>
          <span className='font-medium text-red-400'>{stats.attackDice}</span>
        </div>
      )}
      {stats.damageType && (
        <div className='flex gap-1'>
          <span className='text-zinc-400'>{t('inventory.stats.damage_type')}</span>
          <span className='font-medium text-zinc-200'>
            {t(`inventory.damage_type.${stats.damageType}`)}
          </span>
        </div>
      )}
      {stats.physicalDefDice && (
        <div className='flex gap-1'>
          <span className='text-zinc-400'>{t('inventory.stats.phys_def')}</span>
          <span className='font-medium text-orange-400'>{stats.physicalDefDice}</span>
        </div>
      )}
      {stats.magicDefDice && (
        <div className='flex gap-1'>
          <span className='text-zinc-400'>{t('inventory.stats.magic_def')}</span>
          <span className='font-medium text-blue-400'>{stats.magicDefDice}</span>
        </div>
      )}
      {stats.speed && (
        <div className='flex gap-1'>
          <span className='text-zinc-400'>{t('inventory.stats.speed')}</span>
          <span className='font-medium text-green-400'>{stats.speed}</span>
        </div>
      )}
      {stats.range && (
        <div className='flex gap-1'>
          <span className='text-zinc-400'>{t('inventory.stats.range')}</span>
          <span className='font-medium text-cyan-400'>{stats.range}</span>
        </div>
      )}
    </div>
  )
}
