import { CAMPAIGN_EVENT_TYPE, type CampaignEventType } from '@shared/constants/guild-campaigns.constants'

/**
 * Guild tier thresholds (cumulative totalContribution required to reach that tier).
 * Tier 1 is the base; tiers 2–5 unlock progressively. Curve is exponential — guild
 * progression is meant to be a long-tail signal, not a daily grind.
 */
export const GUILD_TIER_THRESHOLDS = [0, 1000, 5000, 15000, 40000] as const

export const MAX_GUILD_TIER = GUILD_TIER_THRESHOLDS.length

/**
 * Per-event contribution weights. Raw campaign event amounts are imbalanced
 * (ENEMY_KILL fires with amount=1; GOLD_EARNED fires with amount=8–25 per kill).
 * Weights normalise them so kills/habits aren't dwarfed by gold drops.
 */
export const CONTRIBUTION_WEIGHTS: Record<CampaignEventType, number> = {
  [CAMPAIGN_EVENT_TYPE.ENEMY_KILL]: 5,
  [CAMPAIGN_EVENT_TYPE.HABIT_COMPLETION]: 3,
  [CAMPAIGN_EVENT_TYPE.TASK_COMPLETION]: 4,
  [CAMPAIGN_EVENT_TYPE.GOLD_EARNED]: 1
}

/**
 * Compute contribution points awarded for an event. GOLD_EARNED is divided by 5
 * so 25 gold ≈ 5 points (parity with one kill). Others scale linearly with amount.
 */
export function computeContributionPoints(eventType: CampaignEventType, amount: number): number {
  if (amount <= 0) return 0
  const weight = CONTRIBUTION_WEIGHTS[eventType] ?? 0
  if (eventType === CAMPAIGN_EVENT_TYPE.GOLD_EARNED) {
    return Math.floor(amount / 5) * weight
  }
  return amount * weight
}

/** Pure: derives current tier from totalContribution. Handles multi-threshold jumps. */
export function getGuildTier(totalContribution: number): number {
  let tier = 1
  for (let i = 1; i < GUILD_TIER_THRESHOLDS.length; i++) {
    if (totalContribution >= GUILD_TIER_THRESHOLDS[i]) tier = i + 1
    else break
  }
  return tier
}

/** Threshold for the next tier, or null if already at max. */
export function getNextTierThreshold(tier: number): number | null {
  if (tier >= MAX_GUILD_TIER) return null
  return GUILD_TIER_THRESHOLDS[tier]
}

/**
 * Gold multiplier: +5% per tier above 1. Tier 1 = 1.00, Tier 5 = 1.20.
 * Caps at +20%. Bounded so the campaign-tracking feedback loop on GOLD_EARNED
 * (more gold → more contribution → higher tier → more gold) stays small.
 */
export function getGuildGoldMultiplier(tier: number): number {
  const bonus = Math.max(0, tier - 1) * 0.05
  return 1 + bonus
}
