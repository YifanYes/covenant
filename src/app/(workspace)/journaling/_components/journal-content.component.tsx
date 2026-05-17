'use client'

import { sanitizeRichText } from '@shared/lib/sanitize-rich-text.lib'
import { cn } from '@/lib/cn.lib'

interface JournalContentProps {
  html: string
  className?: string
}

export default function JournalContent({ html, className }: JournalContentProps) {
  const sanitized = sanitizeRichText(html)

  return (
    <div
      className={cn('journal-content', className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
