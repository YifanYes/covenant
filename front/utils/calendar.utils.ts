import dayjs from 'dayjs'

export function getMonth(month: number = dayjs().month()): dayjs.Dayjs[][] {
  // Use dayjs to properly handle year rollover when month is outside 0-11 range
  const targetDate = dayjs().month(month)
  const year: number = targetDate.year()
  const normalizedMonth: number = targetDate.month()

  const firstDayOfMonth: number = (dayjs(new Date(year, normalizedMonth, 1)).day() + 6) % 7
  let currentMonthCount: number = 0 - firstDayOfMonth

  return new Array(6).fill([]).map(() => {
    return new Array(7).fill(null).map(() => {
      currentMonthCount += 1
      return dayjs(new Date(year, normalizedMonth, currentMonthCount))
    })
  })
}
