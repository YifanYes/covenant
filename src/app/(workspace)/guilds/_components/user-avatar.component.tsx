import { cn } from '@/lib/cn.lib'

const PALETTE = [
  'bg-amber-500/20 text-amber-300 ring-amber-500/30',
  'bg-emerald-500/20 text-emerald-300 ring-emerald-500/30',
  'bg-sky-500/20 text-sky-300 ring-sky-500/30',
  'bg-rose-500/20 text-rose-300 ring-rose-500/30',
  'bg-violet-500/20 text-violet-300 ring-violet-500/30',
  'bg-orange-500/20 text-orange-300 ring-orange-500/30',
  'bg-teal-500/20 text-teal-300 ring-teal-500/30',
  'bg-fuchsia-500/20 text-fuchsia-300 ring-fuchsia-500/30'
] as const

function hashString(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

interface UserAvatarProps {
  name: string | null | undefined
  seed?: string
  size?: 'sm' | 'md'
  className?: string
}

export default function UserAvatar({ name, seed, size = 'md', className }: UserAvatarProps) {
  const display = name?.trim() || '?'
  const palette = PALETTE[hashString(seed ?? display) % PALETTE.length]
  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full font-title uppercase ring-1 select-none',
        size === 'sm' ? 'h-7 w-7 text-[10px]' : 'h-9 w-9 text-xs',
        palette,
        className
      )}
    >
      {initials(display)}
    </div>
  )
}
