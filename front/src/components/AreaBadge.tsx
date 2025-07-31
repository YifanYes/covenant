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
  },
  {
    color: 'pink',
    styles: 'text-pink-600 border-pink-600 bg-pink-100 hover:text-pink-700 hover:border-pink-700 hover:bg-pink-200'
  },
  {
    color: 'cyan',
    styles: 'text-cyan-600 border-cyan-600 bg-cyan-100 hover:text-cyan-700 hover:border-cyan-700 hover:bg-cyan-200'
  },
  {
    color: 'indigo',
    styles:
      'text-indigo-600 border-indigo-600 bg-indigo-100 hover:text-indigo-700 hover:border-indigo-700 hover:bg-indigo-200'
  },
  {
    color: 'lime',
    styles: 'text-lime-600 border-lime-600 bg-lime-100 hover:text-lime-700 hover:border-lime-700 hover:bg-lime-200'
  },
  {
    color: 'rose',
    styles: 'text-rose-600 border-rose-600 bg-rose-100 hover:text-rose-700 hover:border-rose-700 hover:bg-rose-200'
  },
  {
    color: 'amber',
    styles:
      'text-amber-600 border-amber-600 bg-amber-100 hover:text-amber-700 hover:border-amber-700 hover:bg-amber-200'
  },
  {
    color: 'sky',
    styles: 'text-sky-600 border-sky-600 bg-sky-100 hover:text-sky-700 hover:border-sky-700 hover:bg-sky-200'
  },
  {
    color: 'slate',
    styles:
      'text-slate-600 border-slate-600 bg-slate-100 hover:text-slate-700 hover:border-slate-700 hover:bg-slate-200'
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
