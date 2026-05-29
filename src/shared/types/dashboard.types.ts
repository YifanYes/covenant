export interface DashboardData {
  characterName: string | null
  character: {
    gold: number
    manaReserve: number
    health: number
    maxHealth: number
    mana: number
    maxMana: number
  } | null
  upcomingTasks: UpdatedTask[]
  statusStats: {
    TODO: number
    DOING: number
    OVERDUE: number
  }
  habitsMetrics: {
    completedToday: number
    totalDaily: number
    incompleteDaily: IncompleteHabit[]
  }
  efficiencyMetrics: {
    meanHabitRate: number
    mostCommonType: string | null
    mostFocusedArea: string | null
    mostFocusedObjective: string | null
  }
  taskMetrics: {
    areas: AreaMetric[]
    objectives: ObjectiveMetric[]
    habits: HabitMetric[]
  }
  summary: {
    dueSoonCount: number
    neglectedCount: number
  }
  completionsTrend: TrendPoint[]
}

export interface IncompleteHabit {
  publicId: string
  name: string
  recurrence: number
  completedToday: number
}

export interface TrendPoint {
  date: string
  count: number
}

export interface UpdatedTask {
  id: string
  title: string
  description: string | null
  statusId: string
  color: string | null
  effort: string | null
  impact: string | null
  order: number
  createdAt?: string
  updatedAt?: string
  dueDate: string | null
  completedAt: string | null
  userId: string
  areaColor: string | null
}

export interface AreaMetric {
  name: string
  color: string | null
  icon: string | null
  tasksThisMonth: number
  tasksLastMonth: number
  habitsThisMonth: number
  habitsLastMonth: number
  lastCompletion: string | null
}

export interface ObjectiveMetric {
  name: string
  lastCompletion: string | null
}

export interface HabitMetric {
  name: string
  lastCompletion: string | null
}
