import { useTranslation } from 'react-i18next'
import { Button } from './ui/button'

export default function CalendarSidebar() {
  const { t } = useTranslation()

  return (
    <div className='p-1'>
      <p>Calendar Sidebar</p>
      <Button variant='ghost'>{t('calendar.today')}</Button>
    </div>
  )
}
