# Transactional Email (Brevo)

## Overview

Covenant sends one type of transactional email: the magic-link sign-in email triggered by Better Auth's `magicLink` plugin in `src/server/lib/auth.ts`. The email is sent via Brevo's HTTP API.

We use Brevo because it offers the most generous free tier currently available for transactional email (300 emails/day, ~9,000/month, free forever, no credit card). Earlier the project used Resend, but Resend's free plan only supports one verified domain — that slot was already consumed by another project.

## Environment variables

| Variable        | Required | Description                                                                 |
| --------------- | -------- | --------------------------------------------------------------------------- |
| `BREVO_API_KEY` | Yes      | API key from Brevo dashboard → SMTP & API → API Keys.                       |
| `FROM_EMAIL`    | Yes      | Full email address on a Brevo-verified domain (e.g. `auth@yourdomain.com`). |

Both are validated at startup in `src/server/config.ts`. The app refuses to boot if either is missing.

## Initial setup

### 1. Create a Brevo account

Sign up at <https://www.brevo.com> (no credit card required for the free tier). Confirm the email address Brevo sends to verify the account.

### 2. Verify your sender domain

In the Brevo dashboard:

1. Navigate to **Senders, Domains & Dedicated IPs → Domains**.
2. Click **Add a Domain** and enter the domain you'll send from (e.g. `covenant.app`).
3. Brevo generates a set of DNS records — typically:
   - One TXT record for SPF authentication
   - Two CNAME records for DKIM signing
   - Optionally a DMARC TXT record (recommended)
4. Add these records at your DNS provider (Cloudflare, Namecheap, Route 53, etc.).
5. Click **Authenticate this domain** in Brevo. Verification usually completes within a few minutes once DNS propagates.

Brevo's records use unique selectors and won't conflict with other email providers' records on the same domain (e.g. an existing Resend setup on a different project).

### 3. Generate an API key

In the Brevo dashboard:

1. Navigate to **SMTP & API → API Keys**.
2. Click **Generate a new API key**, name it (e.g. `covenant-prod`), and copy the value.
3. Store it as `BREVO_API_KEY` in your environment (see below).

### 4. Configure environment variables

**Local development** (`.env.local`):

```
BREVO_API_KEY=xkeysib-...
FROM_EMAIL=auth@yourverifieddomain.com
```

**Production** (Vercel, Railway, or your host's dashboard):

- Add `BREVO_API_KEY=<your key>`
- Set `FROM_EMAIL=auth@yourverifieddomain.com` (or any local-part on the verified domain)
- Remove any old `RESEND_API_KEY` if migrating
- Redeploy

`FROM_EMAIL` must be a bare email address (e.g. `auth@yourdomain.com`). The `Name <addr>` form is rejected at startup by the `z.string().email()` validation in `src/server/config.ts`, and Brevo's `sender.email` field expects a bare address anyway. The display name in the From header is hard-coded to `Covenant` in the API request body.

## How it works

`src/server/lib/auth.ts` defines a `sendBrevoEmail` helper that POSTs to `https://api.brevo.com/v3/smtp/email` with the API key in the `api-key` header. The Better Auth `magicLink` plugin's `sendMagicLink` callback calls this helper.

If the HTTP response is not 2xx, the helper throws with the response body. Better Auth surfaces the error to the client; the sign-up page (`src/app/(auth)/sign-up/page.tsx`) catches it and shows a toast. The auth middleware hook also logs `AUTH_FAILURE` events with the error message in production logs.

## Verification

After setup, test end-to-end:

1. Submit a sign-up with a real email address.
2. **Brevo dashboard → Logs → Email activity** should show a `delivered` event within seconds.
3. The recipient inbox receives the magic link.
4. Production logs should not contain `Failed to send email:` messages.

If Brevo shows `delivered` but the inbox is empty, the issue is recipient-side filtering (check Spam, check Gmail's "Promotions" tab) — not the application code. If Brevo shows an error status, the message in the log row gives the exact cause (most commonly: domain not yet verified, or sender email's local-part not allowed by domain auth settings).

## Free tier limits

| Metric         | Limit                                              |
| -------------- | -------------------------------------------------- |
| Daily send cap | 300 emails                                         |
| Monthly cap    | ~9,000 (300 × 30)                                  |
| Domain limit   | Unlimited verified domains                         |
| API rate limit | See <https://developers.brevo.com/docs/api-limits> |

The 300/day cap is shared across all email types on the account (transactional + marketing), but Covenant only sends magic links — the full quota is usable.

If sign-up volume ever approaches the daily cap, options are:

- Brevo paid plan ($9/mo for 5,000 emails/day)
- Switch to Zoho ZeptoMail (10,000 free credits, then $0.25 per 1,000 emails — best deliverability for transactional, near-free at scale)
- AWS SES ($0.10 per 1,000 emails, requires production-mode approval)

## Migration history

- **Before:** Resend SDK (`resend` npm package), `RESEND_API_KEY` env var. Replaced because the free plan's single-domain slot was already used by another project, and `onboarding@resend.dev` (the sandbox sender) only delivers to the Resend account owner's email.
- **After:** Brevo HTTP API via `fetch`, `BREVO_API_KEY` env var. No new dependency added.
