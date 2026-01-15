import { parseTranslationKey } from '@/utils/locale.utils'
import { areasDistributionConfig } from './areas-distribution.config'
import type { AreasDistributionData, AreasDistributionDataItem } from './areas-distribution.model'

export const getAreasDistributionData = (
  data: AreasDistributionDataItem[]
): { localizedData: AreasDistributionDataItem[]; config: AreasDistributionData } => ({
  localizedData: data.map((d) => ({ ...d, name: parseTranslationKey(d.name) })),
  config: {
    thisMonth: {
      ...areasDistributionConfig.thisMonth,
      label: parseTranslationKey(areasDistributionConfig.thisMonth.name),
      name: parseTranslationKey(areasDistributionConfig.thisMonth.name)
    },
    lastMonth: {
      ...areasDistributionConfig.lastMonth,
      label: parseTranslationKey(areasDistributionConfig.lastMonth.name),
      name: parseTranslationKey(areasDistributionConfig.lastMonth.name)
    }
  }
})
