'use client'
import { areaStyles } from '@/types/colors.types'
import { allIcons } from '@/types/icons.types'
import type { Area } from '@/types/models.types'
import { PenSquare } from 'pixelarticons/react'
import { defaultAreas } from '@shared/schemas/areas.schemas'
import { useTranslation } from 'react-i18next'
import UpdateAreaDialog from './update-area-dialog.component'

interface AreaFilterChipProps {
  area: Area
  count: number
  selected: boolean
  onSelect: () => void
}

export default function AreaFilterChip({ area, count, selected, onSelect }: AreaFilterChipProps) {
  const { t } = useTranslation()

  const areaStyle = areaStyles.find((s) => s.color === area.color)
  const currentIcon = allIcons.find((icon) => icon.name === area.icon)
  const isDefaultArea = defaultAreas.some((d) => d.name === area.name)

  if (!areaStyle || !currentIcon) return null

  return (
    <div className="group/chip relative inline-flex">
      <button
        type="button"
        onClick={onSelect}
        aria-pressed={selected}
        className={`inline-flex items-center gap-2 rounded-full border py-1 pl-3 text-sm transition-all duration-200 hover:brightness-110 ${
          !isDefaultArea ? 'pr-8' : 'pr-3'
        } ${areaStyle.styles} ${
          selected ? 'ring-foreground/40 scale-105 shadow-sm ring-2' : 'opacity-80 hover:opacity-100'
        }`}
      >
        <currentIcon.component className="size-4" />
        <span>{t(area.name)}</span>
        <span className="bg-background/60 dark:bg-background/40 ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] leading-none font-semibold">
          {count}
        </span>
      </button>
      {!isDefaultArea && (
        <UpdateAreaDialog
          area={area}
          trigger={
            <button
              type="button"
              aria-label={t('update_area_dialog.title')}
              className="hover:bg-foreground/10 absolute top-1/2 right-1 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-full opacity-0 transition-opacity group-hover/chip:opacity-100 focus-visible:opacity-100"
            >
              <PenSquare className="size-3" />
            </button>
          }
        />
      )}
    </div>
  )
}
