export type TaskType = {
  id?: string
  description?: string | null
  userId?: string
  dueDate?: string | null
  createdAt?: string
  updatedAt?: string
  title: string
  status: string
  order?: number
  objectives?: object[]
}

export type TaskRow = {
  id: string
  name: string
  items: TaskType[]
}
