import { cn } from '@/lib/cn.lib'

interface ArqLogoProps {
  className?: string
}

export default function ArqLogo({ className }: ArqLogoProps) {
  return (
    <div
      style={{
        maskImage: 'url(/arq-logo.svg)',
        maskRepeat: 'no-repeat',
        maskSize: 'contain',
        maskPosition: 'center',
        WebkitMaskImage: 'url(/arq-logo.svg)',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        WebkitMaskPosition: 'center'
      }}
      className={cn('bg-foreground aspect-[598/432]', className)}
    />
  )
}
