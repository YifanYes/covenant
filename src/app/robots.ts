import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/shared/constants/site.constants'

const BASE_URL = SITE_URL

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/auth/',
          '/login',
          '/sign-up',
          '/forgot-password',
          '/reset-password',
          '/onboarding',
          '/dashboard',
          '/tasks',
          '/habits',
          '/objectives',
          '/journaling',
          '/calendar',
          '/quests',
          '/inventory',
          '/shop',
          '/guilds',
          '/tavern',
          '/settings'
        ]
      }
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
    host: BASE_URL
  }
}
