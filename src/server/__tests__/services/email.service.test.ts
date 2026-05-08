import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockFetch = vi.fn()

describe('EmailService', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch)
    vi.resetModules()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('sends email with correct payload and headers', async () => {
    vi.doMock('../../config', () => ({
      env: {
        BREVO_API_KEY: 'test-key',
        FROM_EMAIL: 'test@example.com',
        NODE_ENV: 'test'
      }
    }))

    const { EmailService: ReloadedService } = await import('../../services/email.service')
    const reloaded = new ReloadedService()

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      text: async () => 'ok'
    })

    await reloaded.sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>'
    })

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'api-key': 'test-key',
          'content-type': 'application/json',
          accept: 'application/json'
        },
        body: JSON.stringify({
          sender: { email: 'test@example.com', name: 'Covenant' },
          to: [{ email: 'user@example.com' }],
          subject: 'Test',
          htmlContent: '<p>Hello</p>'
        })
      })
    )
  })

  it('throws on Brevo error response', async () => {
    vi.doMock('../../config', () => ({
      env: {
        BREVO_API_KEY: 'test-key',
        FROM_EMAIL: 'test@example.com',
        NODE_ENV: 'test'
      }
    }))

    const { EmailService: ReloadedService } = await import('../../services/email.service')
    const reloaded = new ReloadedService()

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
      text: async () => 'Bad Request'
    })

    await expect(
      reloaded.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>'
      })
    ).rejects.toThrow('Failed to send email: 400 Bad Request')
  })

  it('throws in production when credentials are missing', async () => {
    vi.doMock('../../config', () => ({
      env: {
        BREVO_API_KEY: undefined,
        FROM_EMAIL: undefined,
        NODE_ENV: 'production'
      }
    }))

    const { EmailService: ReloadedService } = await import('../../services/email.service')
    const reloaded = new ReloadedService()

    await expect(
      reloaded.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hello</p>'
      })
    ).rejects.toThrow('Email send attempted without BREVO_API_KEY / FROM_EMAIL configured')
  })

  it('skips send in non-production when credentials are missing', async () => {
    vi.doMock('../../config', () => ({
      env: {
        BREVO_API_KEY: undefined,
        FROM_EMAIL: undefined,
        NODE_ENV: 'development'
      }
    }))

    const { EmailService: ReloadedService } = await import('../../services/email.service')
    const reloaded = new ReloadedService()

    await reloaded.sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hello</p>'
    })

    expect(mockFetch).not.toHaveBeenCalled()
  })
})
