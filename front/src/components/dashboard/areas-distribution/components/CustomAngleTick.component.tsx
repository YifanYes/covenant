import useTheme from '@/hooks/use-theme'
import { getAreaStylesAndIcon } from '@/utils/areas.utils'
import type { TickItemTextProps } from 'recharts/types/polar/PolarAngleAxis'
import type { AreasDistributionDataItem } from '../AreasDistribution.model'

interface CustomAngleTickComponentProps extends TickItemTextProps {
  data: AreasDistributionDataItem[]
}

export default function CustomAngleTickComponent({ payload, x, y, textAnchor, data }: CustomAngleTickComponentProps) {
  const { theme } = useTheme()
  const area = data?.[payload.index]

  if (!area) return null

  const { icon, styles } = getAreaStylesAndIcon(area)

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
