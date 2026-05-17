'use client'
import type { ItemStats } from '@/shared/constants/items.constants'
import { useTranslation } from 'react-i18next'

interface ItemStatsDisplayProps {
  stats: ItemStats
}

export default function ItemStatsDisplay({ stats }: ItemStatsDisplayProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {stats.strengthAtkBonus !== undefined && stats.strengthAtkBonus !== 0 && (
        <div className="flex gap-1">
          <span className="text-zinc-400">{t('inventory.stats.attack_bonus')}</span>
          <span className="font-medium text-red-400">+{stats.strengthAtkBonus}</span>
        </div>
      )}
      {stats.magicAtkBonus !== undefined && stats.magicAtkBonus !== 0 && (
        <div className="flex gap-1">
          <span className="text-zinc-400">{t('inventory.stats.magic_atk_bonus')}</span>
          <span className="font-medium text-purple-400">+{stats.magicAtkBonus}</span>
        </div>
      )}
      {stats.damageType && (
        <div className="flex gap-1">
          <span className="text-zinc-400">{t('inventory.stats.damage_type')}</span>
          <span className="font-medium text-zinc-200">{t(`inventory.damage_type.${stats.damageType}`)}</span>
        </div>
      )}
      {stats.strengthDefBonus !== undefined && stats.strengthDefBonus !== 0 && (
        <div className="flex gap-1">
          <span className="text-zinc-400">{t('inventory.stats.phys_def_bonus')}</span>
          <span className="font-medium text-orange-400">+{stats.strengthDefBonus}</span>
        </div>
      )}
      {stats.magicDefBonus !== undefined && stats.magicDefBonus !== 0 && (
        <div className="flex gap-1">
          <span className="text-zinc-400">{t('inventory.stats.magic_def_bonus')}</span>
          <span className="font-medium text-blue-400">+{stats.magicDefBonus}</span>
        </div>
      )}
      {stats.speed !== undefined && stats.speed !== 0 && (
        <div className="flex gap-1">
          <span className="text-zinc-400">{t('inventory.stats.speed')}</span>
          <span className="font-medium text-green-400">+{stats.speed}</span>
        </div>
      )}
    </div>
  )
}
