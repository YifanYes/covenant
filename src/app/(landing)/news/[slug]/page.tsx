import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronLeft } from 'pixelarticons/react'
import { createServerI18n } from '@/server/lib/i18n-server'
import { getLandingLocale } from '../../_lib/locale'
import { POSTS, POST_IMPORTS } from '../posts'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = POSTS.find((p) => p.slug === slug)
  if (!post) return {}
  const lang = await getLandingLocale()
  const title = `${post.title[lang]} - Covenant`
  const description = post.excerpt[lang]
  const url = `/news/${post.slug}`
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: { en: url, es: url }
    },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const post = POSTS.find((p) => p.slug === slug)
  if (!post || !POST_IMPORTS[slug]) notFound()

  const lang = await getLandingLocale()
  const i18n = await createServerI18n(lang)
  const t = i18n.t.bind(i18n)
  const { default: Content } = await POST_IMPORTS[slug][lang]()

  return (
    <main className="bg-background min-h-screen pt-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-12 lg:flex-row lg:gap-12">
        <aside className="lg:sticky lg:top-24 lg:h-fit lg:max-h-[calc(100vh-8rem)] lg:w-64 lg:shrink-0 lg:overflow-y-auto">
          <Link
            href="/news"
            className="text-muted-foreground hover:text-primary mb-6 inline-flex items-center gap-1 text-sm transition-colors"
          >
            <ChevronLeft className="size-4" />
            {t('landing.news.back')}
          </Link>
          <div className="text-muted-foreground mb-3 text-xs font-semibold uppercase tracking-wide">
            {t('landing.news.other_posts')}
          </div>
          <nav className="flex flex-col gap-1">
            {POSTS.map((p) => {
              const isActive = p.slug === slug
              return (
                <Link
                  key={p.slug}
                  href={`/news/${p.slug}`}
                  aria-current={isActive ? 'page' : undefined}
                  className={`block rounded-md px-2 py-2 text-sm leading-snug transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <div className="text-xs opacity-70">{p.date}</div>
                  <div className="line-clamp-2">{p.title[lang]}</div>
                </Link>
              )
            })}
          </nav>
        </aside>
        <div className="min-w-0 flex-1 lg:max-w-3xl">
          <div className="text-muted-foreground mb-4 flex items-center gap-3 text-sm">
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.author}</span>
          </div>
          <article>
            <Content />
          </article>
        </div>
      </div>
    </main>
  )
}
