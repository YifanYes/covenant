import { initTRPC } from "@trpc/server"
import { z } from "zod"

const t = initTRPC.create()

const appRouter = t.router({
  greet: t.procedure
    .input(z.object({ name: z.string() }))
    .query(({ input }) => {
      return {
        greeting: `Hello, ${input.name}!`
      }
    })
})

export type AppRouter = typeof appRouter

// TODO: fix server initialization
const { listen } = createHTTPServer({
  router: appRouter
})

listen(3000)
