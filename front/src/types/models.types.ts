export type Area = {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
  color: string | null
  icon: string | null
}

export type Objective = {
  id: string
  name: string
  description?: string | null
  userId: string
  createdAt: string
  updatedAt: string
  dueDate?: string | null
  areas?: Area[]
  habits?: Habit[]
  tasks?: Task[]
}

export type Task = {
  id: string
  title: string
  description?: string | null
  status: string
  order: number
  dueDate?: string | null
  userId: string
  createdAt: string
  updatedAt: string
  objectives: Objective[]
}

export type HabitCompletion = {
  id: string
  habitId: string
  userId: string
  completedAt: string
  habit?: Habit
}

export type Habit = {
  id: string
  name: string
  description?: string | null
  recurrence: number
  timespan: string
  userId: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
  completions?: HabitCompletion[]
  objectives?: Objective[]
}
