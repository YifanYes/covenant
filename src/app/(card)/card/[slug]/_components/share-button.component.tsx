'use client'

import { Upload } from 'pixelarticons/react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import type { CardData } from '../../_data/card-data'

interface ShareButtonProps {
  data: CardData
}

export default function ShareButton({ data }: ShareButtonProps) {
  const { t } = useTranslation()

  const handleShare = async () => {
    const url = `${window.location.origin}/card/${data.slug}`
    const title = `${t(data.nameKey)} - Covenant`

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return
        toast.error(t('card.actions.share'))
      }
    } else {
      try {
        await navigator.clipboard.writeText(url)
        toast.success(t('card.actions.copied'))
      } catch {
        toast.error(t('card.actions.share'))
      }
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex h-14 w-14 items-center justify-center rounded-full bg-[#d4b346] transition-opacity hover:opacity-80 cursor-pointer"
      aria-label={t('card.actions.share')}
    >
      <Upload className="h-6 w-6 text-[#363329]" />
    </button>
  )
}
