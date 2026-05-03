import { logger } from '@/server/lib/logger'
import { clientLogSchema } from '@shared/schemas/logs.schemas'

export async function POST(req: Request) {
  try {
    const result = clientLogSchema.safeParse(await req.json())
    if (!result.success) return Response.json({ error: 'Invalid payload' }, { status: 400 })

    const { level, message, context, timestamp } = result.data
    logger[level]({ source: 'client', timestamp, context }, message)

    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: 'Bad request' }, { status: 400 })
  }
}
