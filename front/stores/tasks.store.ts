'use client'

import type { Task } from '@/types/models.types'
import { create } from 'zustand'

type TasksStore = {
  tasks: Record<string, Task[]>
  selectedTask?: Task
  setTasks: (tasks?: Record<string, Task[]>) => void
  setSelectedTask: (task?: Task) => void
}

export const useTasksStore = create<TasksStore>()((set) => ({
  tasks: {},
  selectedTask: undefined,
  setTasks: (tasks) => set({ tasks: tasks ?? {} }),
  setSelectedTask: (task) => set({ selectedTask: task })
}))
