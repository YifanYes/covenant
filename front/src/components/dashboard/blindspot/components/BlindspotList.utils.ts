import dayjs from 'dayjs'

export const getBlindspotListData = (data: { name: string; lastCompletion: string | null }[]) => {
  return data.filter((d) => !d.lastCompletion || dayjs(d.lastCompletion).isBefore(dayjs().subtract(2, 'week')))
}
