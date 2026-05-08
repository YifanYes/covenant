'use client'
import ThemeToggle from '@/common/theme-toggle.component'
import FactionColorSelector from '@/forms/faction-color-selector.component'
import SingleSelect from '@/forms/single-select.component'
import { useAuthStore } from '@/stores/auth.store'
import { useUserPreferencesStore } from '@/stores/user-preferences.store'
import Button from '@/ui/button.component'
import Input from '@/ui/input.component'
import Label from '@/ui/label.component'
import { useRouter } from 'next/navigation'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ConfirmDeleteAccountDialog } from './_components/confirm-delete-account-dialog.component'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const router = useRouter()
  const { email, signOut } = useAuthStore()
  const { language, defaultTasksView, setDefaultTasksView, setLanguage } = useUserPreferencesStore()

  const handleLanguageChange = (value: string | null) => {
    if (value) {
      setLanguage(value)
      i18n.changeLanguage(value)
    }
  }

  const handleDefaultViewChange = (value: string | null) => value && setDefaultTasksView(value)

  return (
    <div className="min-h-screen w-full p-6">
      <h1 className="text-2xl font-semibold">{t('settings.title')}</h1>
      <div className="flex max-w-md flex-col gap-6 py-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">{t('settings.email_label')}</Label>
          <Input id="email" type="email" value={email} disabled />
        </div>
        <div className="flex flex-col gap-2">
          <SingleSelect
            label={t('settings.language_label')}
            placeholder={t('settings.language_placeholder')}
            value={language}
            onChange={handleLanguageChange}
            options={['en', 'es'].map((value) => ({ value, label: t(`languages.${value}`) }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <SingleSelect
            label={t('settings.default_tasks_view_label')}
            placeholder={t('settings.default_tasks_view_placeholder')}
            value={defaultTasksView}
            onChange={handleDefaultViewChange}
            options={['list', 'table', 'matrix'].map((value) => ({
              value,
              label: t(`tasks.tabs.${value}`)
            }))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="theme">{t('settings.mode_label')}</Label>
          <ThemeToggle />
        </div>
        <div className="flex flex-col gap-2">
          <FactionColorSelector />
        </div>
        <div className="pt-4">
          <Button
            onClick={() =>
              signOut()
                .then(() => router.push('/login'))
                .catch(() => toast.error(t('settings.logout_error')))
            }
            className="w-fit text-muted-foreground border-muted-foreground hover:text-background hover:bg-muted-foreground cursor-pointer border bg-transparent"
          >
            {t('settings.logout_button')}
          </Button>
        </div>
        <div className="pt-4">
          <ConfirmDeleteAccountDialog />
        </div>
      </div>
    </div>
  )
}
