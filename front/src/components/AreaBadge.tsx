import { areaStyles } from '@/types/colors.types'
import { allIcons } from '@/types/icons.types'
import type { Area } from '@/types/models.types'
import { useTranslation } from 'react-i18next'

export default function AreaBadge({ area }: { area: Area }) {
  const { t } = useTranslation()
  const areaStyle = areaStyles.find((defaultArea) => defaultArea.color === area.color)
  const currentIcon = allIcons.find((icon) => icon.name === area.icon)

  if (!areaStyle) {
    return null
  }

  return (
    <div
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors duration-200 ${areaStyle.styles}`}
    >
      {currentIcon && <currentIcon.component className='size-4' />}
      <span>{t(area.name)}</span>
    </div>
  )
}
