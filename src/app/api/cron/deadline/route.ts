export async function POST() {
  return Response.json({ message: 'Deadline cron removed' }, { status: 410 })
}
