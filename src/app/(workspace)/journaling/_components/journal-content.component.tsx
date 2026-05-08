'use client'

import DOMPurify from 'isomorphic-dompurify'
import { cn } from '@/lib/cn.lib'

interface JournalContentProps {
  html: string
  className?: string
}

export default function JournalContent({ html, className }: JournalContentProps) {
  const sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'h1', 'h2', 'ul', 'ol', 'li', 'blockquote', 'code', 'pre', 'hr'],
    ALLOWED_ATTR: []
  })

  return (
    <div
      className={cn('journal-content', className)}
      dangerouslySetInnerHTML={{ __html: sanitized }}
    />
  )
}
