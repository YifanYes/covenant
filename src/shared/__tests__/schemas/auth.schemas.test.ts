import { describe, expect, it } from 'vitest'
import { loginSchema, signUpSchema } from '@shared/schemas/auth.schemas'

describe('loginSchema', () => {
  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'password123' })
    expect(result.success).toBe(false)
  })

  it('rejects password shorter than 8 chars', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'short' })
    expect(result.success).toBe(false)
  })

  it('accepts valid input', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'password123' })
    expect(result.success).toBe(true)
  })
})

describe('signUpSchema', () => {
  const valid = {
    name: 'John Doe',
    email: 'user@example.com',
    password: 'password123',
    confirmPassword: 'password123'
  }

  it('rejects mismatched passwords with error on confirmPassword path', () => {
    const result = signUpSchema.safeParse({ ...valid, confirmPassword: 'different123' })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('confirmPassword')
      const issue = result.error.issues.find((i) => i.path.includes('confirmPassword'))
      expect(issue?.message).toBe('errors.password_mismatch')
    }
  })

  it('rejects password shorter than 8 chars', () => {
    const result = signUpSchema.safeParse({ ...valid, password: 'short', confirmPassword: 'short' })
    expect(result.success).toBe(false)
  })

  it('rejects empty name', () => {
    const result = signUpSchema.safeParse({ ...valid, name: '' })
    expect(result.success).toBe(false)
  })

  it('accepts valid quartet', () => {
    const result = signUpSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })
})
