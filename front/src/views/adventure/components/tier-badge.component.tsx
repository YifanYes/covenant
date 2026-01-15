interface TierBadgeProps {
  tier: number
}

const tierColors: Record<number, string> = {
  1: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  2: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  3: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  4: 'bg-amber-500/20 text-amber-400 border-amber-500/30'
}

export default function TierBadge({ tier }: TierBadgeProps) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${tierColors[tier] || tierColors[1]}`}>
      T{tier}
    </span>
  )
}
