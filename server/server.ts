import cors from '@fastify/cors'
import { fastifyTRPCPlugin, FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify'
import fastify from 'fastify'
import { env } from './config'
import { createContext } from './context'
import { appRouter, type AppRouter } from './router'
import { auth } from './lib/auth'

const server = fastify({
  routerOptions: {
    maxParamLength: 5000
  }
})

async function startServer() {
  try {
    await server.register(cors, {
      origin: [env.FRONT_URL],
      credentials: true
    })

    // Better Auth routes (must be before tRPC)
    server.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      async handler(request, reply) {
        try {
          const url = new URL(request.url, `http://${request.headers.host}`)

          const headers = new Headers()
          Object.entries(request.headers).forEach(([key, value]) => {
            if (value) headers.append(key, Array.isArray(value) ? value.join(', ') : value)
          })

          const body = request.method === 'POST' && request.body
            ? JSON.stringify(request.body)
            : undefined

          const req = new Request(url.toString(), {
            method: request.method,
            headers,
            ...(body ? { body } : {})
          })

          const response = await auth.handler(req)

          reply.status(response.status)
          response.headers.forEach((value, key) => reply.header(key, value))

          const responseBody = await response.text()
          reply.send(responseBody || null)
        } catch (error) {
          console.error('Authentication Error:', error)
          reply.status(500).send({ error: 'Internal authentication error' })
        }
      }
    })

    server.register(fastifyTRPCPlugin, {
      prefix: '/trpc',
      trpcOptions: {
        router: appRouter,
        createContext,
        onError({ path, error }) {
          console.error(`Error in tRPC handler on path '${path}':`, error)
        }
      } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions']
    })

    await server.listen({ port: env.PORT })
    console.log(`Server is running at port ${env.PORT}`)
  } catch (err) {
    console.error('Failed to start server:', err)
    server.log.error(err)
    process.exit(1)
  }
}

startServer()
