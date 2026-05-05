'use client'
import { cn } from '@/lib/cn.lib'
import { Target as Bullseye, Heart, Shield, Trophy } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'

interface KillRecordStatsProps {
  stats: {
    totalKills: number
    totalDamageDealt: number
    totalDamageTaken: number
    totalCriticalHits: number
  }
}

export default function KillRecordStats({ stats }: KillRecordStatsProps) {
  const { t } = useTranslation()

  const statCards = [
    {
      label: t('inventory.kill_record.total_kills'),
      value: stats.totalKills,
      icon: Trophy,
      color: 'text-yellow-500'
    },
    {
      label: t('inventory.kill_record.damage_dealt'),
      value: stats.totalDamageDealt,
      icon: Bullseye,
      color: 'text-emerald-500'
    },
    {
      label: t('inventory.kill_record.damage_received'),
      value: stats.totalDamageTaken,
      icon: Heart,
      color: 'text-red-500'
    },
    {
      label: t('inventory.kill_record.critical_hits'),
      value: stats.totalCriticalHits,
      icon: Shield,
      color: 'text-purple-500'
    }
  ]

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {statCards.map((stat) => {
        const Icon = stat.icon
        return (
          <div
            key={stat.label}
            className="border-border bg-muted/30 flex flex-col items-center gap-2 rounded-lg border p-3"
          >
            <Icon className={cn('h-6 w-6', stat.color)} />
            <span className="text-xl font-bold">{stat.value.toLocaleString()}</span>
            <span className="text-muted-foreground text-center text-xs">{stat.label}</span>
          </div>
        )
      })}
    </div>
  )
}
