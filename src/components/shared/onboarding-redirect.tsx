'use client'
import Button from '@/ui/button.component'
import Link from 'next/link'
import { useTranslation } from 'react-i18next'

export default function OnboardingRedirect() {
  const { t } = useTranslation()

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-white">{t('inventory.no_character.title')}</h2>
        <p className="mt-2 text-zinc-400">{t('inventory.no_character.description')}</p>
      </div>
      <Button asChild variant="default" size="sm">
        <Link href="/onboarding">{t('inventory.no_character.button')}</Link>
      </Button>
    </div>
  )
}
