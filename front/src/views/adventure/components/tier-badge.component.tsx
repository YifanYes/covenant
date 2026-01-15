interface TierBadgeProps {
  tier: number
}

const tierColors: Record<number, string> = {
  1: 'bg-tier-1/20 text-tier-1 border-tier-1/30',
  2: 'bg-tier-2/20 text-tier-2 border-tier-2/30',
  3: 'bg-tier-3/20 text-tier-3 border-tier-3/30',
  4: 'bg-tier-4/20 text-tier-4 border-tier-4/30'
}

export default function TierBadge({ tier }: TierBadgeProps) {
  return (
    <span className={`rounded border px-1.5 py-0.5 text-xs font-medium ${tierColors[tier] || tierColors[1]}`}>
      T{tier}
    </span>
  )
}
