import type { GenericEndpointContext } from 'better-auth'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  DEFAULT_LOCALE,
  extractLocaleFromCallbackURL,
  resolveCreateUserLocale,
  resolveEmailLocale,
  validateLocale
} from '../../lib/auth-locale.utils'

vi.mock('../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn()
    }
  }
}))

import { prisma } from '../../lib/prisma'

const mockPrismaUserFindUnique = prisma.user.findUnique as ReturnType<typeof vi.fn>

describe('validateLocale', () => {
  it('returns en for valid "en" input', () => {
    expect(validateLocale('en')).toBe('en')
  })

  it('returns es for valid "es" input', () => {
    expect(validateLocale('es')).toBe('es')
  })

  it('returns default locale for unsupported language', () => {
    expect(validateLocale('fr')).toBe(DEFAULT_LOCALE)
  })

  it('returns default locale for empty string', () => {
    expect(validateLocale('')).toBe(DEFAULT_LOCALE)
  })

  it('returns default locale for null', () => {
    expect(validateLocale(null)).toBe(DEFAULT_LOCALE)
  })

  it('returns default locale for undefined', () => {
    expect(validateLocale(undefined)).toBe(DEFAULT_LOCALE)
  })

  it('returns default locale for XSS-like values', () => {
    expect(validateLocale('<script>alert(1)</script>')).toBe(DEFAULT_LOCALE)
  })

  it('returns default locale for path traversal value', () => {
    expect(validateLocale('../../etc/passwd')).toBe(DEFAULT_LOCALE)
  })
})

describe('extractLocaleFromCallbackURL', () => {
  it('returns en when callbackURL contains locale=en', () => {
    expect(extractLocaleFromCallbackURL('https://example.com/login?locale=en')).toBe('en')
  })

  it('returns es when callbackURL contains locale=es', () => {
    expect(extractLocaleFromCallbackURL('https://example.com/login?locale=es')).toBe('es')
  })

  it('returns null when callbackURL has no locale param', () => {
    expect(extractLocaleFromCallbackURL('https://example.com/login')).toBeNull()
  })

  it('returns null when callbackURL has unsupported locale', () => {
    expect(extractLocaleFromCallbackURL('https://example.com/login?locale=fr')).toBeNull()
  })

  it('returns null when callbackURL has XSS locale value', () => {
    expect(extractLocaleFromCallbackURL('https://example.com/login?locale=<script>alert(1)</script>')).toBeNull()
  })

  it('returns null when callbackURL has path traversal locale value', () => {
    expect(extractLocaleFromCallbackURL('https://example.com/login?locale=../../etc/passwd')).toBeNull()
  })

  it('returns null for malformed URL', () => {
    expect(extractLocaleFromCallbackURL('not-a-url')).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(extractLocaleFromCallbackURL(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(extractLocaleFromCallbackURL('')).toBeNull()
  })

  it('handles URL with multiple params including locale', () => {
    expect(extractLocaleFromCallbackURL('https://example.com/onboarding?foo=bar&locale=en&baz=qux')).toBe('en')
  })
})

describe('resolveEmailLocale', () => {
  const email = 'test@example.com'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns user locale from database when stored', async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ userSettings: { locale: 'en' } })
    const result = await resolveEmailLocale(email)
    expect(result).toBe('en')
    expect(mockPrismaUserFindUnique).toHaveBeenCalledWith({
      where: { email },
      select: { userSettings: { select: { locale: true } } }
    })
  })

  it('returns validated locale even when stored locale is invalid', async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ userSettings: { locale: 'fr' } })
    const result = await resolveEmailLocale(email)
    expect(result).toBe(DEFAULT_LOCALE)
  })

  it('falls back to callbackURL locale when no stored user', async () => {
    mockPrismaUserFindUnique.mockResolvedValue(null)
    const ctx = {
      query: { callbackURL: 'https://example.com/login?locale=en' }
    } as unknown as GenericEndpointContext
    const result = await resolveEmailLocale(email, ctx)
    expect(result).toBe('en')
  })

  it('falls back to cookie locale when no stored user and no callbackURL', async () => {
    mockPrismaUserFindUnique.mockResolvedValue(null)
    const ctx = {
      query: {},
      getCookie: vi.fn().mockReturnValue('en')
    } as unknown as GenericEndpointContext
    const result = await resolveEmailLocale(email, ctx)
    expect(result).toBe('en')
  })

  it('falls back to default when no source has locale', async () => {
    mockPrismaUserFindUnique.mockResolvedValue(null)
    const ctx = {
      query: {},
      getCookie: vi.fn().mockReturnValue(null)
    } as unknown as GenericEndpointContext
    const result = await resolveEmailLocale(email, ctx)
    expect(result).toBe(DEFAULT_LOCALE)
  })

  it('validates cookie locale against allowlist', async () => {
    mockPrismaUserFindUnique.mockResolvedValue(null)
    const ctx = {
      query: {},
      getCookie: vi.fn().mockReturnValue('zh')
    } as unknown as GenericEndpointContext
    const result = await resolveEmailLocale(email, ctx)
    expect(result).toBe(DEFAULT_LOCALE)
  })

  it('prefers stored locale over callbackURL and cookie', async () => {
    mockPrismaUserFindUnique.mockResolvedValue({ userSettings: { locale: 'en' } })
    const ctx = {
      query: { callbackURL: 'https://example.com/login?locale=es' },
      getCookie: vi.fn().mockReturnValue('es')
    } as unknown as GenericEndpointContext
    const result = await resolveEmailLocale(email, ctx)
    expect(result).toBe('en')
  })

  it('handles ctx being undefined', async () => {
    mockPrismaUserFindUnique.mockResolvedValue(null)
    const result = await resolveEmailLocale(email, undefined)
    expect(result).toBe(DEFAULT_LOCALE)
  })
})

describe('resolveCreateUserLocale', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns locale from callbackURL', async () => {
    const ctx = {
      query: { callbackURL: 'https://example.com/onboarding?locale=en' }
    } as unknown as GenericEndpointContext
    const result = await resolveCreateUserLocale(ctx)
    expect(result).toBe('en')
  })

  it('falls back to cookie when no callbackURL locale', async () => {
    const ctx = {
      query: {},
      getCookie: vi.fn().mockReturnValue('en')
    } as unknown as GenericEndpointContext
    const result = await resolveCreateUserLocale(ctx)
    expect(result).toBe('en')
  })

  it('validates cookie against allowlist', async () => {
    const ctx = {
      query: {},
      getCookie: vi.fn().mockReturnValue('ja')
    } as unknown as GenericEndpointContext
    const result = await resolveCreateUserLocale(ctx)
    expect(result).toBe(DEFAULT_LOCALE)
  })

  it('falls back to default when no source available', async () => {
    const ctx = {
      query: {},
      getCookie: vi.fn().mockReturnValue(null)
    } as unknown as GenericEndpointContext
    const result = await resolveCreateUserLocale(ctx)
    expect(result).toBe(DEFAULT_LOCALE)
  })

  it('handles ctx being undefined', async () => {
    const result = await resolveCreateUserLocale(undefined)
    expect(result).toBe(DEFAULT_LOCALE)
  })
})
