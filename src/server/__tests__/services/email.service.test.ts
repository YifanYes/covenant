import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { EmailService } from '../../services/email.service'

vi.mock('../../config', () => ({
  env: {
    BREVO_API_KEY: 'test-api-key',
    FROM_EMAIL: 'test@example.com'
  }
}))

describe('EmailService', () => {
  const originalFetch = global.fetch
  let emailService: EmailService

  beforeEach(() => {
    vi.clearAllMocks()
    global.fetch = vi.fn()
    emailService = new EmailService()
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('sends email with correct payload to Brevo API', async () => {
    const mockResponse = { ok: true, status: 201 } as Response
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    await emailService.sendEmail({
      to: 'user@example.com',
      subject: 'Test Subject',
      html: '<p>Hello</p>'
    })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.brevo.com/v3/smtp/email',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'api-key': 'test-api-key',
          'content-type': 'application/json',
          accept: 'application/json'
        }
      })
    )

    const callArgs = vi.mocked(global.fetch).mock.calls[0]
    const body = JSON.parse(callArgs[1]!.body as string)
    expect(body.sender).toEqual({ email: 'test@example.com', name: 'Covenant' })
    expect(body.to).toEqual([{ email: 'user@example.com' }])
    expect(body.subject).toBe('Test Subject')
    expect(body.htmlContent).toBe('<p>Hello</p>')
  })

  it('throws on non-OK response from Brevo', async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      text: vi.fn().mockResolvedValue('Bad Request')
    } as unknown as Response
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    await expect(
      emailService.sendEmail({
        to: 'user@example.com',
        subject: 'Test',
        html: '<p>Hi</p>'
      })
    ).rejects.toThrow('Failed to send email: 400 Bad Request')
  })

  it('passes abort signal to fetch for timeout', async () => {
    const mockResponse = { ok: true, status: 201 } as Response
    vi.mocked(global.fetch).mockResolvedValue(mockResponse)

    await emailService.sendEmail({
      to: 'user@example.com',
      subject: 'Test',
      html: '<p>Hi</p>'
    })

    const callArgs = vi.mocked(global.fetch).mock.calls[0]
    const signal = callArgs[1]!.signal
    expect(signal).toBeInstanceOf(AbortSignal)
  })
})
