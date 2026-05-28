import { logger } from './logger'
import { getPostHog } from './posthog'

export type AnalyticsEvent =
  | { name: 'user_signed_up'; props: { signup_method: 'email' | 'google'; email_domain: string } }
  | {
      name: 'character_created'
      props: { faction: string; magic_nature: string; character_class: string }
    }
  | {
      name: 'task_completed'
      props: { task_id: string; impact: string; mana_earned: number; reserve_gained: number }
    }
  | {
      name: 'habit_completed'
      props: {
        habit_id: string
        streak_length: number
        streak_tier: number
        mana_earned: number
        reserve_gained: number
      }
    }
  | {
      name: 'objective_completed'
      props: { objective_id: string; mana_earned: number; reserve_gained: number }
    }
  | {
      name: 'journal_entry_created'
      props: { entry_id: string; mana_earned: number; reserve_gained: number }
    }
  | {
      name: 'combat_started'
      props: {
        quest_id: string
        character_tier: number
        enemy_template_id: string
        reserve_at_start: number
        mana_at_start: number
      }
    }
  | {
      name: 'combat_finished'
      props: {
        quest_id: string
        enemy_id: string
        outcome: 'victory' | 'defeat' | 'abandoned'
        gold_earned: number | null
      }
    }
  | { name: 'loop_closed'; props: { d_since_signup: number } }

export type PersonTraits = Record<string, string | number | boolean | null>

type EventName = AnalyticsEvent['name']
type EventProps<N extends EventName> = Extract<AnalyticsEvent, { name: N }>['props']

export interface AnalyticsService {
  track<N extends EventName>(distinctId: string, name: N, props: EventProps<N>): void
  identify(distinctId: string, traits: PersonTraits): void
  setPersonProperties(distinctId: string, traits: PersonTraits): void
}

// Server client is constructed with `disableGeoip: true`, so events already skip
// IP-based geo enrichment. No need to inject `$ip`/`$useragent` overrides per call.
class Analytics implements AnalyticsService {
  track<N extends EventName>(distinctId: string, name: N, props: EventProps<N>): void {
    const ph = getPostHog()
    if (!ph) return
    try {
      ph.capture({ distinctId, event: name, properties: props as Record<string, unknown> })
    } catch (err) {
      logger.warn({ err, event: name }, 'PostHog capture failed')
    }
  }

  identify(distinctId: string, traits: PersonTraits): void {
    const ph = getPostHog()
    if (!ph) return
    try {
      ph.identify({ distinctId, properties: traits })
    } catch (err) {
      logger.warn({ err }, 'PostHog identify failed')
    }
  }

  setPersonProperties(distinctId: string, traits: PersonTraits): void {
    const ph = getPostHog()
    if (!ph) return
    try {
      ph.capture({ distinctId, event: '$set', properties: { $set: traits } })
    } catch (err) {
      logger.warn({ err }, 'PostHog setPersonProperties failed')
    }
  }
}

export const analytics: AnalyticsService = new Analytics()
