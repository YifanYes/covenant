import cors from '@fastify/cors'
import { fastifyTRPCPlugin, type FastifyTRPCPluginOptions } from '@trpc/server/adapters/fastify'
import fastify from 'fastify'
import cron from 'node-cron'
import { env } from './config'
import { createContext } from './context'
import { auth } from './lib/auth'
import { prisma } from './lib/prisma'
import { appRouter, type AppRouter } from './router'
import { ServiceFactory } from './services/service.factory'

const server = fastify({
  routerOptions: {
    maxParamLength: 5000
  },
  trustProxy: env.NODE_ENV === 'prod'
})

async function startServer() {
  try {
    await server.register(cors, {
      origin: [env.FRONT_URL],
      credentials: true
    })

    // Health check route
    server.get('/health', async () => {
      return { status: 'ok', timestamp: new Date().toISOString() }
    })

    // Better Auth routes (must be before tRPC)
    server.route({
      method: ['GET', 'POST'],
      url: '/api/auth/*',
      async handler(request, reply) {
        try {
          const url = new URL(request.url, `${request.protocol}://${request.headers.host}`)

          const headers = new Headers()
          Object.entries(request.headers).forEach(([key, value]) => {
            if (value) headers.append(key, Array.isArray(value) ? value.join(', ') : value)
          })

          const body = request.method === 'POST' && request.body ? JSON.stringify(request.body) : undefined

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

    // Type assertion needed due to fastify version mismatch between root and server node_modules
    server.register(fastifyTRPCPlugin as Parameters<typeof server.register>[0], {
      prefix: '/trpc',
      trpcOptions: {
        router: appRouter,
        createContext,
        onError({ path, error }) {
          console.error(`Error in tRPC handler on path '${path}':`, error)
        }
      } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions']
    })

    await server.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`Server is running at port ${env.PORT}`)

    // Schedule deadline validation cron job to run daily at 00:00
    cron.schedule('0 0 * * *', async () => {
      console.log('[Cron] Running deadline validation...')
      try {
        const services = new ServiceFactory(prisma)
        const result = await services.deadline.validateDeadlines()
        console.log('[Cron] Deadline validation completed:', result)
      } catch (error) {
        console.error('[Cron] Deadline validation failed:', error)
      }
    })
    console.log('[Cron] Deadline validation scheduled for 00:00 daily')
  } catch (err) {
    console.error('Failed to start server:', err)
    server.log.error(err)
    process.exit(1)
  }
}

startServer()
