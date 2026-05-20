'use client'

import { cn } from '@/lib/cn.lib'
import { sanitizeRichText } from '@shared/lib/sanitize-rich-text.lib'

interface GuildDescriptionViewProps {
  html: string | null | undefined
  className?: string
}

export default function GuildDescriptionView({ html, className }: GuildDescriptionViewProps) {
  if (!html) return null
  const sanitized = sanitizeRichText(html)
  return (
    <div
      className={cn('journal-content text-sm text-muted-foreground', className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
