import { ConfirmDeleteAccountDialog } from '@/components/dialogs/ConfirmDeleteAccountDialog'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/hooks/use-auth-store'
import { useTranslation } from 'react-i18next'

export default function Settings() {
  const { t } = useTranslation()
  const { email } = useAuthStore()

  return (
    <div className='min-h-screen w-full p-6'>
      <h1 className='text-2xl font-semibold'>{t('settings.title')}</h1>
      <div className='flex max-w-md flex-col gap-6 py-4'>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='email'>{t('settings.email_label')}</Label>
          <Input id='email' type='email' value={email} disabled />
        </div>
        <div className='flex flex-col gap-2'>
          <Label htmlFor='theme'>{t('settings.theme_label')}</Label>
          <ThemeToggle />
        </div>
        <div className='pt-4'>
          <ConfirmDeleteAccountDialog />
        </div>
      </div>
    </div>
  )
}
