import type { OnboardingProgress } from '@shared/schemas/onboarding.schemas'
import { analytics as defaultAnalytics, type AnalyticsService } from '../lib/analytics'
import { logger } from '../lib/logger'
import type { CharacterRepository } from '../repositories/character.repository'

const log = logger.child({ util: 'loop-closed' })

type LoopClosedOnboarding = OnboardingProgress & { loopClosedAt?: string }

/**
 * Fires `loop_closed` exactly once per user — the first time a completion-with-mana
 * (task/habit/journal/objective) AND a quest start have both happened. Guard is
 * stored in `Character.onboardingProgress.loopClosedAt` to avoid an extra PostHog
 * round-trip or a schema migration.
 */
export async function evaluateLoopClosed(
  userId: string,
  characterRepository: CharacterRepository,
  analytics: AnalyticsService = defaultAnalytics
): Promise<void> {
  try {
    const progress = (await characterRepository.getOnboardingProgress(userId)) as LoopClosedOnboarding
    if (progress.loopClosedAt) return

    if (!progress.manaEarned || !progress.questStarted) return

    // Lazy import keeps `loop-closed.utils.ts` test-friendly: services that import
    // this helper otherwise pull in prisma + env-validation at module-load time.
    const { prisma } = await import('../lib/prisma')
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { createdAt: true } })
    if (!user) return

    const dSinceSignup = Math.max(0, Math.floor((Date.now() - user.createdAt.getTime()) / 86_400_000))
    const firedAt = new Date().toISOString()

    const shouldTrack = await characterRepository.setLoopClosedAt(userId, firedAt)
    if (!shouldTrack) return
    analytics.track(userId, 'loop_closed', { d_since_signup: dSinceSignup })
  } catch (err) {
    log.warn({ err, userId }, 'loop_closed evaluation failed')
  }
}
