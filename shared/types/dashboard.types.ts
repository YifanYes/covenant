export interface DashboardData {
  characterName: string | null
  character: {
    gold: number
    diceBank: number
    maxDice: number
    health: number
    mana: number
  } | null
  upcomingTasks: UpdatedTask[]
  statusStats: {
    TODO: number
    DOING: number
    DONE: number
    OVERDUE: number
  }
  habitsMetrics: {
    completedToday: number
    totalDaily: number
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
  }
}

export interface UpdatedTask {
  id: string
  title: string
  description: string | null
  status: string
  color: string | null
  effort: string | null
  impact: string | null
  order: number
  createdAt: string | undefined
  updatedAt: string | undefined
  dueDate: string | null
  completedAt: Date | null
  userId: string
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
