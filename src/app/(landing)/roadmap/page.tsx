import { cookies } from 'next/headers'
import { buildPageMetadata } from '../_lib/page-metadata'

export const generateMetadata = () => buildPageMetadata({ pageKey: 'roadmap', path: '/roadmap' })

const SUPPORTED_LOCALES = ['en', 'es'] as const
type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export default async function RoadmapPage() {
  const cookieStore = await cookies()
  const rawLang = cookieStore.get('i18nextLng')?.value
  const lang: SupportedLocale = SUPPORTED_LOCALES.includes(rawLang as SupportedLocale) ? (rawLang as SupportedLocale) : 'en'

  const Content = (await import(`./${lang === 'es' ? 'content.es.mdx' : 'content.en.mdx'}`)).default

  return (
    <main className="bg-background min-h-screen pt-16">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <article>
          <Content />
        </article>
      </div>
    </main>
  )
}
