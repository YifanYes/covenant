'use client'
import { MagicNature } from '@/shared/constants/classes.constants'
import { useTranslation } from 'react-i18next'

interface MagicNatureBadgeProps {
  magicNature: string
}

export default function MagicNatureBadge({ magicNature }: MagicNatureBadgeProps) {
  const { t } = useTranslation()

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-bold uppercase ${
        magicNature === MagicNature.FORM ? 'bg-blue-400/10 text-blue-400' : 'bg-red-400/10 text-red-400'
      }`}
    >
      {t(`inventory.magic_nature.${magicNature}`)}
    </span>
  )
}
