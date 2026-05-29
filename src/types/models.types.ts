export type Area = {
  publicId: string
  name: string
  color: string | null
  icon: string | null
}

export type Objective = {
  publicId: string
  name: string
  description?: string | null
  createdAt: Date
  updatedAt: Date
  dueDate?: Date | null
  completedAt?: Date | null
  areas?: Area[]
  habits?: Habit[]
  tasks?: Task[]
}

export type UserTaskStatus = {
  publicId: string
  label: string
  color: string | null
  isDefault: boolean
}

export type Task = {
  publicId: string
  title: string
  description?: string | null
  statusPublicId?: string
  status?: UserTaskStatus | null
  color?: string | null
  effort?: string | null
  impact?: string | null
  order: number
  dueDate?: Date | null
  createdAt?: Date
  updatedAt?: Date
  objectives?: Objective[]
  areas?: Area[]
}

export type HabitCompletion = {
  publicId: string
  completedAt: Date
}

export type Habit = {
  publicId: string
  name: string
  description?: string | null
  recurrence: number
  timespan: string
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date | null
  completions?: HabitCompletion[]
  objectives?: Objective[]
  areas?: Area[]
  lastCompletedAt?: Date | null
}
