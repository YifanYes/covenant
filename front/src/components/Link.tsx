import { type ReactNode } from 'react'

export default function Link({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <a
      href={href}
      className={`text-blue-400 hover:text-blue-500 hover:underline transition-colors duration-200 ${className || ''}`}
    >
      {children}
    </a>
  )
}
