'use client'

import ArqLogo from '@/components/common/arq-logo.component'
import Image from 'next/image'
import { useTranslation } from 'react-i18next'
import type { CardData } from '../../_data/card-data'
import CardLinkButton from './card-link-button.component'
import QrCodeDialog from './qr-code-dialog.component'
import ShareButton from './share-button.component'

interface CardViewProps {
  data: CardData
}

export default function CardView({ data }: CardViewProps) {
  const { t } = useTranslation()

  return (
    <main className="relative mx-auto flex min-h-screen max-w-md flex-col items-center px-6 py-12 pb-28">
      {/* Profile photo */}
      <div className="mb-6 h-40 w-40 overflow-hidden rounded-full border-2 border-[#d4b346]/30 bg-[#d4b346]/5">
        <Image
          src={data.photo}
          alt={t(data.nameKey)}
          width={160}
          height={160}
          className="h-full w-full object-cover"
          priority
        />
      </div>

      {/* Name */}
      <h1 className="mb-1 font-(family-name:--font-eb-garamond)! text-3xl font-bold text-[#d4b346]!">
        {t(data.nameKey)}
      </h1>

      {/* Project name */}
      <p className="mb-1 font-(family-name:--font-eb-garamond)! text-xl tracking-normal text-[#d4b346]/70">
        {t('card.project')}
      </p>

      {/* Quote */}
      <p className="mb-4 text-center font-(family-name:--font-eb-garamond)! text-lg italic text-[#d4b346]/80">
        &ldquo;{t(data.quoteKey)}&rdquo;
      </p>

      {/* Logo */}
      <ArqLogo className="mb-10 h-8 bg-[#d4b346]/70" />

      {/* Link buttons */}
      <div className="flex w-full flex-col gap-3">
        {data.links.map((link) => (
          <CardLinkButton key={link.labelKey} link={link} />
        ))}
      </div>

      {/* Bottom floating actions */}
      <div className="fixed bottom-8 left-1/2 flex -translate-x-1/2 gap-4">
        <QrCodeDialog data={data} />
        <ShareButton data={data} />
      </div>
    </main>
  )
}
