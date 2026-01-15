import { Switch } from '@/ui'
import useTheme from '@/hooks/use-theme'
import { Moon, Sun } from '@nsmr/pixelart-react'

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  return (
    <div className='relative'>
      <Switch
        className='peer bg-input data-[state=checked]:bg-primary h-6 w-11 [&>span]:hidden'
        checked={theme === 'dark'}
        onCheckedChange={toggleTheme}
      />
      <div className='bg-background text-foreground pointer-events-none absolute top-0.5 left-0.5 flex h-5 w-5 items-center justify-center rounded-full shadow transition-transform peer-data-[state=checked]:translate-x-5'>
        {theme === 'dark' ? (
          <Moon className='fill-foreground h-3.5 w-3.5' />
        ) : (
          <Sun className='fill-foreground h-3.5 w-3.5' />
        )}
      </div>
    </div>
  )
}
