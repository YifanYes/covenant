'use client'

import ArqLogo from '@/components/common/arq-logo.component'
import Dialog, { DialogContent, DialogTitle, DialogTrigger } from '@/components/ui/dialog.component'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import Image from 'next/image'
import { QRCodeSVG } from 'qrcode.react'
import { useSyncExternalStore } from 'react'
import { useTranslation } from 'react-i18next'
import type { CardData } from '../../_data/card-data'

const noopSubscribe = () => () => {}

interface QrCodeDialogProps {
  data: CardData
}

export default function QrCodeDialog({ data }: QrCodeDialogProps) {
  const { t } = useTranslation()
  const cardUrl = useSyncExternalStore(
    noopSubscribe,
    () => `${window.location.origin}/card/${data.slug}`,
    () => `/card/${data.slug}`
  )

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d4b346] transition-opacity hover:opacity-80 cursor-pointer"
          aria-label={t('card.actions.show_qr')}
        >
          <svg className="h-6 w-6 text-[#363329]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm11-2h2v2h-2v-2zm-4 0h2v2h-2v-2zm0 4h2v2h-2v-2zm4 0h2v2h-2v-2zm2-4h2v4h-2v-4zm0 6h2v2h-2v-2z" />
          </svg>
        </button>
      </DialogTrigger>
      <DialogContent className="border-[#d4b346]/30! bg-[#363329]! sm:max-w-sm" showCloseButton>
        <VisuallyHidden.Root>
          <DialogTitle>{t('card.actions.show_qr')}</DialogTitle>
        </VisuallyHidden.Root>
        <div className="flex flex-col items-center gap-1 py-4">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-[#d4b346]/30 mb-2">
            <Image
              src={data.photo}
              alt={t(data.nameKey)}
              width={80}
              height={80}
              className="h-full w-full object-cover"
            />
          </div>
          <h2 className="font-(family-name:--font-eb-garamond)! text-xl font-bold text-[#d4b346]!">
            {t(data.nameKey)}
          </h2>
          <p className="text-center font-(family-name:--font-eb-garamond)! text-sm text-[#d4b346]/70">
            {t('card.project')}
          </p>
          <p className="text-center font-(family-name:--font-eb-garamond)! text-sm italic text-[#d4b346]/70">
            &ldquo;{t(data.quoteKey)}&rdquo;
          </p>
          <ArqLogo className="h-6 bg-[#d4b346]/70 mt-4 mb-8" />
          <QRCodeSVG value={cardUrl} size={200} bgColor="#363329" fgColor="#d4b346" level="M" />
        </div>
      </DialogContent>
    </Dialog>
  )
}
