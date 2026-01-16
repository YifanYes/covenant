import { type ReactNode } from 'react'

export default function Link({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a href={href} className={`text-link hover:text-link-hover transition-colors duration-200 ${className || ''}`}>
      {children}
    </a>
  )
}
