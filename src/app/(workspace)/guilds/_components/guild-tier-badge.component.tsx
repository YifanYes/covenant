'use client'

import { cn } from '@/lib/cn.lib'
import { GUILD_TIER_COLORS, GUILD_TIER_LABELS, type GuildTierLabel } from '@shared/constants/guild-progression.constants'
import { useTranslation } from 'react-i18next'

interface GuildTierBadgeProps {
  tier: number
  className?: string
}

export default function GuildTierBadge({ tier, className }: GuildTierBadgeProps) {
  const { t } = useTranslation()
  const clamped = Math.max(1, Math.min(5, Math.round(tier))) as 1 | 2 | 3 | 4 | 5
  const label: GuildTierLabel = GUILD_TIER_LABELS[clamped]
  const palette = GUILD_TIER_COLORS[label]

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
        palette.text,
        palette.bg,
        palette.border,
        className
      )}
    >
      {t(`guilds.tier.${label.toLowerCase()}`)}
    </span>
  )
}
