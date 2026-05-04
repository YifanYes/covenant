import { describe, expect, it } from 'vitest'
import { hashSessionToken } from '../../lib/session-token'

describe('hashSessionToken', () => {
  it('returns a 64-character hex string', () => {
    const hash = hashSessionToken('sometoken')
    expect(hash).toHaveLength(64)
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('is deterministic', () => {
    const token = 'abc123xyz'
    expect(hashSessionToken(token)).toBe(hashSessionToken(token))
  })

  it('produces different hashes for different tokens', () => {
    expect(hashSessionToken('token-a')).not.toBe(hashSessionToken('token-b'))
  })

  it('matches known SHA-256 digest', () => {
    expect(hashSessionToken('test')).toBe('9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08')
  })
})
