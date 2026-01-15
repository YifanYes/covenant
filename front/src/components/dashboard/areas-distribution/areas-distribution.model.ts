import type { ChartConfig } from '@/ui'
import type { RadarProps } from 'recharts'

export type AreasDistributionData = Record<string, Omit<RadarProps, 'name'> & { name: string }> & ChartConfig

export type AreasDistributionDataItem = {
  name: string
  icon: string | null
  color: string | null
  thisMonth: number
  lastMonth: number
}
