export const PRISMA_UNIQUE_VIOLATION = 'P2002'

export function isPrismaUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === PRISMA_UNIQUE_VIOLATION
  )
}

export function isPrismaUniqueViolationOn(error: unknown, field: string): boolean {
  if (!isPrismaUniqueViolation(error)) return false
  const target = (error as { meta?: { target?: unknown } }).meta?.target
  if (Array.isArray(target)) return target.includes(field)
  if (typeof target === 'string') return target.includes(field)
  return false
}
