import type { AppRouter } from '@/server/router'
import type { inferRouterInputs, inferRouterOutputs } from '@trpc/server'

export type RouterOutputs = inferRouterOutputs<AppRouter>
export type RouterInputs = inferRouterInputs<AppRouter>

// Derived types from tRPC responses
export type Task = RouterOutputs['tasks']['getAll']['tasks'][string][number]
export type Area = RouterOutputs['areas']['getAll']['areas'][number]
export type Objective = RouterOutputs['objectives']['getAll']['objectives'][number]
export type Habit = RouterOutputs['habits']['getAll']['habits'][number]
export type Quest = RouterOutputs['quest']['list'][number]
export type GuildMessage = RouterOutputs['guilds']['getMessages'][number]
export type GuildMember = NonNullable<RouterOutputs['guilds']['getMyGuild']>['guild']['members'][number]
