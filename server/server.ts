import cors from '@fastify/cors'
import { fastifyTRPCPlugin, FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify'
import fastify from 'fastify'
import { appRouter, type AppRouter } from './router'

const server = fastify({
  maxParamLength: 5000
})

async function startServer() {
  try {
    await server.register(cors, {
      origin: (origin, cb) => {
        cb(null, true) // allow all origins
      },
      credentials: true
    })

    server.register(fastifyTRPCPlugin, {
      prefix: '/trpc',
      trpcOptions: {
        router: appRouter,
        onError({ path, error }) {
          console.error(`Error in tRPC handler on path '${path}':`, error)
        }
      } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions']
    })

    await server.listen({ port: 2022 })
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

startServer()
