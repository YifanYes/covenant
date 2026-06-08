import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.component'
import { createServerI18n } from '@/server/lib/i18n-server'
import Link from 'next/link'
import { BookOpen } from 'pixelarticons/react'
import LandingPagination from '../_components/landing-pagination.component'
import { getLandingLocale } from '../_lib/locale'
import { type PageSearchParams, paginateItems } from '../_lib/pagination'

const episodes = [
  {
    slug: 'sabotaje-nocturno',
    titleKey: 'landing.story.episodes.sabotaje_nocturno.title',
    descriptionKey: 'landing.story.episodes.sabotaje_nocturno.description'
  }
]

const STORY_PAGE_SIZE = 10

interface StoryPageProps {
  searchParams: Promise<PageSearchParams>
}

export default async function StoryPage({ searchParams }: StoryPageProps) {
  const { page: pageParam } = await searchParams
  const lang = await getLandingLocale()
  const i18n = await createServerI18n(lang)
  const t = i18n.t.bind(i18n)
  const { items, page, totalPages } = paginateItems(episodes, pageParam, STORY_PAGE_SIZE)

  return (
    <main className="bg-background min-h-screen pt-16">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="font-title text-foreground mb-4 text-4xl font-bold">{t('landing.story.title')}</h1>
          <p className="text-muted-foreground text-lg">{t('landing.story.subtitle')}</p>
        </div>

        <div className="grid gap-6">
          {items.map((episode, index) => {
            const episodeNumber = (page - 1) * STORY_PAGE_SIZE + index + 1

            return (
              <Link key={episode.slug} href={`/story/${episode.slug}`}>
                <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                  <CardHeader>
                    <div className="flex items-center gap-4">
                      <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                        <BookOpen className="text-primary h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-xl">
                          {t('landing.story.episode')} {episodeNumber}: {t(episode.titleKey)}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">{t(episode.descriptionKey)}</CardDescription>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>

        <LandingPagination
          basePath="/story"
          page={page}
          totalPages={totalPages}
          labels={{
            previous: t('landing.pagination.previous'),
            next: t('landing.pagination.next'),
            page: t('landing.pagination.page'),
            currentPage: t('landing.pagination.current_page'),
            status: t('landing.pagination.status', { page, totalPages })
          }}
        />
      </div>
    </main>
  )
}
