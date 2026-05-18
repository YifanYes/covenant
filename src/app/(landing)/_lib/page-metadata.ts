import type { Metadata } from 'next'
import { createServerI18n } from '@/server/lib/i18n-server'
import { getLandingLocale } from './locale'

interface BuildPageMetadataInput {
  pageKey: string
  path: string
  ogType?: 'website' | 'article'
}

export async function buildPageMetadata({
  pageKey,
  path,
  ogType = 'website'
}: BuildPageMetadataInput): Promise<Metadata> {
  const lang = await getLandingLocale()
  const i18n = await createServerI18n(lang)
  const t = i18n.t.bind(i18n)
  const title = t(`landing.meta.pages.${pageKey}.title`)
  const description = t(`landing.meta.pages.${pageKey}.description`)
  return {
    title,
    description,
    alternates: {
      canonical: path,
      languages: { en: path, es: path }
    },
    openGraph: {
      title,
      description,
      url: path,
      type: ogType
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  }
}
