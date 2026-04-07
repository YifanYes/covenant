import { cn } from '@/lib/cn.lib'

interface CovenantLogoProps {
  className?: string
}

export default function CovenantLogo({ className }: CovenantLogoProps) {
  return (
    <div
      style={{
        maskImage: 'url(/covenant-logo.svg)',
        maskRepeat: 'no-repeat',
        maskSize: 'contain',
        maskPosition: 'center',
        WebkitMaskImage: 'url(/covenant-logo.svg)',
        WebkitMaskRepeat: 'no-repeat',
        WebkitMaskSize: 'contain',
        WebkitMaskPosition: 'center'
      }}
      className={cn('bg-foreground aspect-[598/432]', className)}
    />
  )
}
