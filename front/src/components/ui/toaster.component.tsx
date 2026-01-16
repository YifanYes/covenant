import { useTheme } from '@/hooks/use-theme'
import { Toaster as Sonner } from 'sonner'

type ToasterProps = React.ComponentProps<typeof Sonner>

export default function Toaster({ ...props }: ToasterProps) {
  const { theme = 'system' } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className='toaster group'
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'group toast flex items-start gap-3 w-full rounded-lg border px-4 py-3 shadow-lg bg-background text-foreground border-border data-[type=error]:bg-red-50 data-[type=error]:text-red-900 data-[type=error]:border-red-800 dark:data-[type=error]:bg-red-900/95 dark:data-[type=error]:text-red-100 dark:data-[type=error]:border-red-400 data-[type=success]:bg-green-50 data-[type=success]:text-green-900 data-[type=success]:border-green-800 dark:data-[type=success]:bg-green-900/95 dark:data-[type=success]:text-green-100 dark:data-[type=success]:border-green-400',
          title: 'text-sm font-semibold [&+div]:text-xs',
          description:
            'text-sm opacity-90 data-[type=error]:text-red-800/90 dark:data-[type=error]:text-red-300/90 data-[type=success]:text-green-800/90 dark:data-[type=success]:text-green-300/90',
          actionButton: 'bg-primary text-primary-foreground',
          cancelButton: 'bg-muted text-muted-foreground',
          icon: 'data-[type=error]:text-red-800 dark:data-[type=error]:text-red-300 data-[type=success]:text-green-800 dark:data-[type=success]:text-green-300'
        }
      }}
      {...props}
    />
  )
}
