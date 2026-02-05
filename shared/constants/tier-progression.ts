// Tier progression requirements for cumulative kills
// These values are accelerated for testing purposes
export const TIER_REQUIREMENTS = [
  { tier: 2, killsRequired: 10 },
  { tier: 3, killsRequired: 30 }
] as const

export const MAX_BETA_TIER = 3

/**
 * Calculate what tier a character should be at based on total kills
 * @param totalKills - Total enemies defeated
 * @param currentTier - Character's current tier
 * @returns The tier the character should be at
 */
export function calculateTierFromKills(totalKills: number, currentTier: number): number {
  let newTier = currentTier
  for (const req of TIER_REQUIREMENTS) {
    if (totalKills >= req.killsRequired && req.tier > newTier && req.tier <= MAX_BETA_TIER) {
      newTier = req.tier
    }
  }
  return newTier
}

export interface TierProgressInfo {
  currentKills: number
  requiredKills: number
  percentage: number
  nextTier: number
}

/**
 * Get progress information toward the next tier
 * @param totalKills - Total enemies defeated
 * @param currentTier - Character's current tier
 * @returns Progress info or null if at max tier
 */
export function getTierProgress(totalKills: number, currentTier: number): TierProgressInfo | null {
  if (currentTier >= MAX_BETA_TIER) return null

  const nextReq = TIER_REQUIREMENTS.find((r) => r.tier === currentTier + 1)
  if (!nextReq) return null

  return {
    currentKills: totalKills,
    requiredKills: nextReq.killsRequired,
    percentage: Math.min(100, Math.floor((totalKills / nextReq.killsRequired) * 100)),
    nextTier: nextReq.tier
  }
}
