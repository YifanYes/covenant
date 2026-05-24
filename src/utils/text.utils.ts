/**
 * Format reward text for a productivity completion toast.
 * Phase 2A: granted mana now feeds combat (overflow → Reserve).
 */
export const getRewardText = (mana: number, reserve = 0, reserveLabel = 'Reserve') => {
  if (mana <= 0 && reserve <= 0) return ''
  if (reserve <= 0) return ` (+${mana} ✨)`
  if (mana <= 0) return ` (+${reserve} ⚡ ${reserveLabel})`
  return ` (+${mana} ✨ +${reserve} ⚡)`
}
