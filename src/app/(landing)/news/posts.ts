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
    slug: '2026-05-24-week-in-review',
    title: {
      en: 'A Week in Covenant: A Fresh Home Page, Tasks Your Way, and Guild Identity',
      es: 'Una semana en Covenant: Una página de inicio renovada, tareas a tu manera e identidad de gremio'
    },
    date: '2026-05-24',
    author: 'Yifan',
    tags: ['release-notes', 'features'],
    excerpt: {
      en: 'The dashboard gets a real home page with a trend chart and quick-complete habits, tasks gain user-defined statuses and per-tab visibility, habits add Today/List/Heatmap views, guilds get lore, member titles, and tier badges, plus a checklist-based onboarding revision.',
      es: 'El panel estrena una página de inicio de verdad con un gráfico de tendencias y hábitos de completado rápido, las tareas ganan estados definidos por el usuario y visibilidad por pestaña, los hábitos añaden vistas Hoy/Lista/Mapa de calor, los gremios estrenan lore, títulos de miembro e insignias de nivel, más una revisión de incorporación basada en lista de verificación.'
    }
  },
  {
    slug: '2026-05-18-week-in-review',
    title: {
      en: 'A Week in Covenant: Combat Reborn and Guilds Complete',
      es: 'Una semana en Covenant: Combate renacido y Gremios completos'
    },
    date: '2026-05-18',
    author: 'Yifan',
    tags: ['release-notes', 'features'],
    excerpt: {
      en: 'Combat rebuilt around mana regen, guilds get shared campaigns and tier progression, Covenant goes open source, plus the Tavern, kanban tasks, and quest backdrops.',
      es: 'Combate reconstruido en torno a la regeneración de maná, los gremios estrenan campañas compartidas y progresión por niveles, Covenant se vuelve de código abierto, más la Taberna, tareas kanban y fondos de misión.'
    }
  },
  {
    slug: '2026-05-11-week-in-review',
    title: {
      en: 'A Week in Covenant: Guilds, Quests, and Better Sign-In',
      es: 'Una semana en Covenant: Gremios, Misiones y un mejor inicio de sesión'
    },
    date: '2026-05-11',
    author: 'Yifan',
    tags: ['release-notes', 'features'],
    excerpt: {
      en: 'Email-and-password sign-in replaces magic links, guilds arrive with chat and invite links, quests add a solo combat layer, plus daily journaling and a smoother first thirty seconds.',
      es: 'Inicio de sesión con correo y contraseña en lugar de magic links, llegan los gremios con chat y enlaces de invitación, las misiones añaden una capa de combate en solitario, más diario diario y unos primeros treinta segundos más fluidos.'
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
  },
  '2026-05-18-week-in-review': {
    en: () => import('./_posts/2026-05-18-week-in-review.en.mdx'),
    es: () => import('./_posts/2026-05-18-week-in-review.es.mdx')
  },
  '2026-05-24-week-in-review': {
    en: () => import('./_posts/2026-05-24-week-in-review.en.mdx'),
    es: () => import('./_posts/2026-05-24-week-in-review.es.mdx')
  }
}
