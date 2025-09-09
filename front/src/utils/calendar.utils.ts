import dayjs from 'dayjs'

export function getMonth(month: number = dayjs().month()): dayjs.Dayjs[][] {
  const year: number = dayjs().year()

  const firstDayOfMonth: number = (dayjs(new Date(year, month, 1)).day() + 6) % 7
  let currentMonthCount: number = 0 - firstDayOfMonth

  return new Array(6).fill([]).map(() => {
    return new Array(7).fill(null).map(() => {
      currentMonthCount += 1
      return dayjs(new Date(year, month, currentMonthCount))
    })
  })
}
