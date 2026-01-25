import { parseTranslationKey } from '@/utils/locale.utils'
import type { PieProps } from 'recharts'

export const parseDashboardPieChartConfig = (data: PieProps['data']) =>
  data?.map((item) => {
    const dataItem = item as Record<string, unknown>
    return { ...dataItem, name: parseTranslationKey(dataItem.name as string) }
  }) || []
