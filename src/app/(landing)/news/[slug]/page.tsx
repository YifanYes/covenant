import { notFound } from 'next/navigation'
import { getLandingLocale } from '../../_lib/locale'
import { POSTS, POST_IMPORTS } from '../posts'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  return POSTS.map((post) => ({ slug: post.slug }))
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const post = POSTS.find((p) => p.slug === slug)
  if (!post) return {}
  const lang = await getLandingLocale()
  return { title: `${post.title[lang]} - Covenant` }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const post = POSTS.find((p) => p.slug === slug)
  if (!post || !POST_IMPORTS[slug]) notFound()

  const lang = await getLandingLocale()
  const { default: Content } = await POST_IMPORTS[slug][lang]()

  return (
    <main className="bg-background min-h-screen pt-16">
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="text-muted-foreground mb-4 flex items-center gap-3 text-sm">
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.author}</span>
        </div>
        <article>
          <Content />
        </article>
      </div>
    </main>
  )
}
