import useTheme from '@/hooks/use-theme'
import { areaSimpleStyles } from '@/types/colors.types'
import { allIcons } from '@/types/icons.types'

export default function CustomAngleTick({ payload, x, y, textAnchor, data }: any) {
  const { theme } = useTheme()
  const area = data?.[payload.index]

  if (!area) return null

  const icon = allIcons.find((icon) => icon.name === area.iconName)
  const styles = areaSimpleStyles?.find((style) => style.color === area.color)?.styles

  return (
    <g transform={`translate(${x},${y})`}>
      {icon?.component ? (
        <icon.component
          x={textAnchor === 'start' ? -4 : textAnchor === 'end' ? -12 : -8}
          y={-10}
          width={16}
          height={16}
          className={styles}
        />
      ) : (
        <text
          dy={6}
          textAnchor={textAnchor}
          fontSize='8px'
          fontWeight='medium'
          fill={theme === 'dark' ? '#bebab1' : '#5d5c55'}
        >
          {payload.value}
        </text>
      )}
    </g>
  )
}
