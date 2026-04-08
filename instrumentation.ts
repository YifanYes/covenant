export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron')
    const { prisma } = await import('@/server/lib/prisma')
    const { ServiceFactory } = await import('@/server/services/service.factory')
    const { logger } = await import('@/server/lib/logger')

    const log = logger.child({ service: 'deadline-cron' })

    cron.schedule('0 0 * * *', async () => {
      log.info('Running deadline validation')
      try {
        const services = new ServiceFactory(prisma)
        const result = await services.deadline.validateDeadlines()
        log.info(result, 'Deadline validation completed')
      } catch (error) {
        log.error(error, 'Deadline validation failed')
      }
    })

    log.info('Deadline validation cron job scheduled (daily at 00:00 UTC)')
  }
}
