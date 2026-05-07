import { hashSessionToken } from './session-token'

export function hashWhereToken(where: unknown): { where: unknown; restoreMap: Map<string, string> | null } {
  if (!where || typeof where !== 'object') return { where, restoreMap: null }
  const w = where as Record<string, unknown>
  const token = w.token

  if (typeof token === 'string') {
    const hashed = hashSessionToken(token)
    return { where: { ...w, token: hashed }, restoreMap: new Map([[hashed, token]]) }
  }

  if (token && typeof token === 'object') {
    const t = token as Record<string, unknown>
    if (typeof t.equals === 'string') {
      const hashed = hashSessionToken(t.equals)
      return {
        where: { ...w, token: { ...t, equals: hashed } },
        restoreMap: new Map([[hashed, t.equals]])
      }
    }
    if (Array.isArray(t.in)) {
      const map = new Map<string, string>()
      const hashedIn = t.in.map((v) => {
        if (typeof v !== 'string') return v
        const h = hashSessionToken(v)
        map.set(h, v)
        return h
      })
      return { where: { ...w, token: { ...t, in: hashedIn } }, restoreMap: map }
    }
  }

  return { where, restoreMap: null }
}

export function restoreTokenFromMap<T>(row: T, map: Map<string, string> | null): T {
  if (!map || !row || typeof row !== 'object') return row
  if ('token' in row && typeof (row as { token: unknown }).token === 'string') {
    const raw = map.get((row as { token: string }).token)
    if (raw) return { ...(row as object), token: raw } as T
  }
  return row
}
