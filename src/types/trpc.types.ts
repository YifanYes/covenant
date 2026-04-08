import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'
import type { AppRouter } from '@/server/router'

export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>

// Derived types from tRPC responses
export type Task = RouterOutputs['tasks']['getAll']['tasks'][string][number]
export type Area = RouterOutputs['areas']['getAll']['areas'][number]
export type Objective = RouterOutputs['objectives']['getAll']['objectives'][number]
export type Habit = RouterOutputs['habits']['getAll']['habits'][number]
export type Activity = RouterOutputs['activity']['list'][number]
