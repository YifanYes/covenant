import { parseTranslationKey } from '@/utils/locale.utils'
import type { PieProps } from 'recharts'

export const parseDashboardPieChartConfig = (data: PieProps['data']) =>
  data?.map((item) => ({ ...item, name: parseTranslationKey(item.name as string) })) || []
