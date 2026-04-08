'use client'

import Card, { CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.component'
import { BookOpen } from '@nsmr/pixelart-react'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

const episodes = [
  {
    slug: 'sabotaje-nocturno',
    titleKey: 'landing.story.episodes.sabotaje_nocturno.title',
    descriptionKey: 'landing.story.episodes.sabotaje_nocturno.description'
  }
]

export default function StoryPage() {
  const { t } = useTranslation()

  return (
    <main className="bg-background min-h-screen pt-16">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8 text-center">
          <h1 className="font-title text-foreground mb-4 text-4xl font-bold">{t('landing.story.title')}</h1>
          <p className="text-muted-foreground text-lg">{t('landing.story.subtitle')}</p>
        </div>

        <div className="grid gap-6">
          {episodes.map((episode, index) => (
            <Link key={episode.slug} href={`/story/${episode.slug}`}>
              <Card className="border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader>
                  <div className="flex items-center gap-4">
                    <div className="bg-primary/10 flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
                      <BookOpen className="text-primary h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">
                        {t('landing.story.episode')} {index + 1}: {t(episode.titleKey)}
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{t(episode.descriptionKey)}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
