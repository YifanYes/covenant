'use client'

import CovenantLogo from '@/components/common/covenant-logo.component'
import Button from '@/components/ui/button.component'
import DropdownMenu, {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu.component'
import { ChevronDown } from '@nsmr/pixelart-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'

const locales = [
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' }
]

export default function Navbar() {
  const { t, i18n } = useTranslation()
  const router = useRouter()

  const changeLocale = (locale: string) => {
    i18n.changeLanguage(locale)
    router.refresh()
  }

  const navLinks = [
    { href: '/news', label: t('landing.nav.news') },
    { href: '/story', label: t('landing.nav.story') },
    { href: '/mechanics', label: t('landing.nav.mechanics') },
    { href: '/magic-nature', label: t('landing.nav.magic_nature') },
    { href: '/roadmap', label: t('landing.nav.roadmap') }
  ]

  return (
    <nav className="bg-background/80 fixed top-0 right-0 left-0 z-50 border-b backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/">
          <CovenantLogo className="h-12" />
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-6 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-sm font-medium transition-colors">
              {i18n.language.toUpperCase()}
              <ChevronDown className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {locales.map((locale) => (
                <DropdownMenuItem key={locale.code} onClick={() => changeLocale(locale.code)}>
                  {locale.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild size="sm">
            <Link href="/login">{t('landing.nav.enter')}</Link>
          </Button>
        </div>
      </div>
    </nav>
  )
}
