import type { ChartConfig } from '@/components/ui/chart'
import type { RadarProps } from 'recharts'

export type AreasDistributionData = Record<string, Omit<RadarProps, 'name'> & { name: string }> & ChartConfig

export type AreasDistributionDataItem = {
  area: string
  icon: string | null
  color: string | null
  thisMonth: number
  lastMonth: number
}
