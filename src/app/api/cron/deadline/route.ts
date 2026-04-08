import { prisma } from '@/server/lib/prisma'
import { ServiceFactory } from '@/server/services/service.factory'

export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const services = new ServiceFactory(prisma)
  const result = await services.deadline.validateDeadlines()

  return Response.json(result)
}
