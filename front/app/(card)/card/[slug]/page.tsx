import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { allCardSlugs, cardDataMap } from '../_data/card-data'
import CardView from './_components/card-view.component'

interface CardPageProps {
  params: Promise<{ slug: string }>
}

export function generateStaticParams() {
  return allCardSlugs.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: CardPageProps): Promise<Metadata> {
  const { slug } = await params
  const data = cardDataMap[slug]
  if (!data) return {}

  return {
    title: `Covenant - ${data.slug.charAt(0).toUpperCase() + data.slug.slice(1)}`,
    description: 'Digital business card for the Covenant team',
    openGraph: {
      title: 'Covenant - Digital Card',
      type: 'profile',
      images: [data.photo]
    }
  }
}

export default async function CardPage({ params }: CardPageProps) {
  const { slug } = await params
  const data = cardDataMap[slug]

  if (!data) {
    notFound()
  }

  return <CardView data={data} />
}
