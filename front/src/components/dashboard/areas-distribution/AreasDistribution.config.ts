import type { AreasDistributionData } from './AreasDistribution.model'

export const areasDistributionConfig: AreasDistributionData = {
  thisMonth: {
    name: 'dashboard.areas_distribution.this_month',
    color: 'var(--chart-4)',
    stroke: 'var(--chart-4)',
    fill: 'var(--chart-4)',
    fillOpacity: 0.6,
    dataKey: 'thisMonth'
  },
  lastMonth: {
    name: 'dashboard.areas_distribution.last_month',
    color: 'var(--chart-2)',
    stroke: 'var(--chart-2)',
    fill: 'var(--chart-2)',
    fillOpacity: 0.2,
    dataKey: 'lastMonth'
  }
}
