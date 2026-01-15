import dayjs from 'dayjs'
import { create } from 'zustand'

type CalendarStore = {
  monthIndex: number
  setMonthIndex: (index: number) => void
}

export const useCalendarStore = create<CalendarStore>()((set) => ({
  monthIndex: dayjs().month(),
  setMonthIndex: (index: number) => set({ monthIndex: index })
}))
