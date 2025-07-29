import { Banknote, Brain, BriefcaseBusiness, Dumbbell, Gamepad2, Heart, Users } from 'lucide-react'
import type { JSX } from 'react'
import { useTranslation } from 'react-i18next'

const areaStyles = [
  {
    color: 'green',
    styles:
      'text-green-600 border-green-600 bg-green-100 hover:text-green-700 hover:border-green-700 hover:bg-green-200'
  },
  {
    color: 'purple',
    styles:
      'text-purple-600 border-purple-600 bg-purple-100 hover:text-purple-700 hover:border-purple-700 hover:bg-purple-200'
  },
  {
    color: 'orange',
    styles:
      'text-orange-600 border-orange-600 bg-orange-100 hover:text-orange-700 hover:border-orange-700 hover:bg-orange-200'
  },
  {
    color: 'red',
    styles: 'text-red-600 border-red-600 bg-red-100 hover:text-red-700 hover:border-red-700 hover:bg-red-200'
  },
  {
    color: 'blue',
    styles: 'text-blue-600 border-blue-600 bg-blue-100 hover:text-blue-700 hover:border-blue-700 hover:bg-blue-200'
  },
  {
    color: 'yellow',
    styles:
      'text-yellow-600 border-yellow-600 bg-yellow-100 hover:text-yellow-700 hover:border-yellow-700 hover:bg-yellow-200'
  },
  {
    color: 'teal',
    styles: 'text-teal-600 border-teal-600 bg-teal-100 hover:text-teal-700 hover:border-teal-700 hover:bg-teal-200'
  }
]

const areaIcons: { [key: string]: JSX.Element } = {
  Banknote: <Banknote />,
  Brain: <Brain />,
  Users: <Users />,
  Heart: <Heart />,
  BriefcaseBusiness: <BriefcaseBusiness />,
  Dumbbell: <Dumbbell />,
  Gamepad2: <Gamepad2 />
}

export default function AreaBadge({
  area
}: {
  area: {
    id: string
    name: string
    userId: string
    createdAt: string
    updatedAt: string
    color: string | null
    icon: string | null
  }
}) {
  const { t } = useTranslation()
  const areaStyle = areaStyles.find((defaultArea) => defaultArea.color === area.color)

  if (!areaStyle) {
    return null
  }

  return (
    <div
      className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm transition-colors duration-200 ${areaStyle.styles}`}
    >
      {areaIcons[area.icon || 'Banknote']}
      <span>{t(area.name)}</span>
    </div>
  )
}
