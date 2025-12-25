import type { Area, Task } from '@/types/models.types'
import { TaskStatus } from '@shared/schemas/tasks.schemas'
import dayjs from 'dayjs'

const getBlindspot = (items: any[], completions: Record<string, dayjs.Dayjs | null>, threshold: dayjs.Dayjs) =>
  items.reduce(
    (acc, item) => {
      const lastCompletion = completions[item.id]
      return !lastCompletion || lastCompletion!.isBefore(threshold)
        ? [...acc, { name: item.name, lastCompletion }]
        : acc
    },
    [] as { name: string; lastCompletion: dayjs.Dayjs | null }[]
  )

const updateIfLater = (map: Record<string, dayjs.Dayjs | null>, id: string, completionDate: dayjs.Dayjs) => {
  if (!map[id] || completionDate.isAfter(map[id])) map[id] = completionDate
}

export const getBlindspotsData = (areas: Area[], tasks: Task[]) => {
  const threshold = dayjs().subtract(2, 'weeks')
  const areaLasts: Record<string, dayjs.Dayjs | null> = Object.fromEntries(areas.map((a) => [a.id, null]))
  const objLasts: Record<string, dayjs.Dayjs | null> = {}
  const objPool = new Map<string, any>()

  tasks.forEach(({ status, updatedAt, objectives }) => {
    const completionDate = status === TaskStatus.DONE && updatedAt ? dayjs(updatedAt) : null

    objectives?.forEach((obj) => {
      objPool.set(obj.id, obj)

      if (!completionDate) {
        return
      }

      updateIfLater(objLasts, obj.id, completionDate)
      obj.areas?.forEach((area: any) => updateIfLater(areaLasts, area.id, completionDate))
    })
  })

  return {
    blindspotAreas: getBlindspot(areas, areaLasts, threshold),
    blindspotObjectives: getBlindspot(Array.from(objPool.values()), objLasts, threshold)
  }
}
