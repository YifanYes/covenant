import type { AreasDistributionDataItem } from '@/components/dashboard/areas-distribution/areas-distribution.model'
import { areaSimpleStyles } from '@/types/colors.types'
import { allIcons } from '@/types/icons.types'
import type { Area } from '@/types/models.types'

export const getAreaStylesAndIcon = (area: AreasDistributionDataItem | Area) => {
  const icon = allIcons.find((icon) => icon.name === area.icon)
  const styles = areaSimpleStyles.find((style) => style.color === area.color)?.styles
  return { icon, styles }
}
