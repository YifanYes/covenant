import Link from 'next/link'
import { ArrowRight } from 'pixelarticons/react'
import { createServerI18n } from '@/server/lib/i18n-server'
import { getLandingLocale } from '../_lib/locale'
import { buildPageMetadata } from '../_lib/page-metadata'
import { POSTS } from './posts'

export const generateMetadata = () => buildPageMetadata({ pageKey: 'news', path: '/news' })

const TAG_COLORS: Record<string, string> = {
  'release-notes': 'bg-primary/10 text-primary border-primary/20',
  security: 'bg-red-500/10 text-red-400 border-red-500/20',
  features: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  infra: 'bg-blue-500/10 text-blue-400 border-blue-500/20'
}

export default async function NewsPage() {
  const lang = await getLandingLocale()
  const i18n = await createServerI18n(lang)
  const t = i18n.t.bind(i18n)

  return (
    <main className="bg-background min-h-screen pt-16">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-12">
          <h1 className="font-[family:var(--font-title)] mb-3 text-5xl font-bold">{t('landing.news.title')}</h1>
          <p className="text-muted-foreground max-w-xl text-lg leading-relaxed">{t('landing.news.subtitle')}</p>
        </div>

        <div className="flex flex-col gap-4">
          {POSTS.map((post) => (
            <Link key={post.slug} href={`/news/${post.slug}`} className="group block">
              <div className="border-border bg-card hover:border-primary/30 rounded-xl border p-6 transition-all duration-200 hover:shadow-md">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="text-muted-foreground mb-2 text-xs">
                      {post.date} · {post.author}
                    </div>
                    <h2 className="font-[family:var(--font-title)] mb-2 text-lg font-semibold leading-snug">
                      {post.title[lang]}
                    </h2>
                    <p className="text-muted-foreground mb-3 text-sm leading-relaxed">{post.excerpt[lang]}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${TAG_COLORS[tag] ?? 'bg-muted text-muted-foreground border-border'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ArrowRight className="text-muted-foreground group-hover:text-primary mt-1 size-5 shrink-0 transition-all duration-200 group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
