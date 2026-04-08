'use client'

import { ChevronRight, Contact, ExternalLink, Github, Mail, Message } from '@nsmr/pixelart-react'
import { useTranslation } from 'react-i18next'
import type { CardLink } from '../../_data/card-data'

const iconMap = {
  globe: ExternalLink,
  mail: Mail,
  github: Github,
  linkedin: Contact,
  message: Message
} as const

interface CardLinkButtonProps {
  link: CardLink
}

export default function CardLinkButton({ link }: CardLinkButtonProps) {
  const { t } = useTranslation()
  const Icon = iconMap[link.icon]

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex w-full items-center gap-4 rounded-xl border border-[#d4b346]/40 px-5 py-4 transition-colors hover:border-[#d4b346]/70 hover:bg-[#d4b346]/5"
    >
      <Icon className="h-5 w-5 shrink-0 text-[#d4b346]" />
      <span className="flex-1 font-(family-name:--font-eb-garamond)! text-sm font-semibold tracking-wide text-[#d4b346]">
        {t(link.labelKey)}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[#d4b346]/50" />
    </a>
  )
}
