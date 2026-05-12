import type React from 'react'
import type { SupportedLocale } from '../_lib/locale'

type LocalizedString = Record<SupportedLocale, string>

export interface BlogPost {
  slug: string
  title: LocalizedString
  date: string
  author: string
  tags: string[]
  excerpt: LocalizedString
}

export const POSTS: BlogPost[] = [
  {
    slug: '2026-05-11-week-in-review',
    title: {
      en: 'A Week in Covenant: Guilds, Quests, and a Security Overhaul',
      es: 'Una semana en Covenant: Gremios, Misiones y una revisión de seguridad'
    },
    date: '2026-05-11',
    author: 'Yifan',
    tags: ['release-notes', 'security', 'features', 'infra'],
    excerpt: {
      en: 'Security improvements compound. Guilds, Quests, Journaling, and a full auth overhaul — a week that shipped fast because past refactors paid off.',
      es: 'Las mejoras de seguridad se acumulan. Gremios, Misiones, Diario y una revisión completa de autenticación — una semana que se envió rápido porque las refactorizaciones pasadas dieron frutos.'
    }
  }
]

export const POST_IMPORTS: Record<
  string,
  Record<SupportedLocale, () => Promise<{ default: React.ComponentType }>>
> = {
  '2026-05-11-week-in-review': {
    en: () => import('./_posts/2026-05-11-week-in-review.en.mdx'),
    es: () => import('./_posts/2026-05-11-week-in-review.es.mdx')
  }
}
