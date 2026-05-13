# Transactional Email Setup (Brevo)

Covenant sends one type of transactional email — the magic-link sign-in email triggered by Better Auth's `magicLink` plugin in `src/server/lib/auth.ts`. The email is sent via Brevo's HTTP API.

Brevo offers a free tier (300 emails/day, no credit card) that comfortably covers early-stage projects. The implementation is provider-agnostic enough that swapping to AWS SES, ZeptoMail, or another provider is straightforward.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `BREVO_API_KEY` | Yes | API key from Brevo dashboard → SMTP & API → API Keys |
| `FROM_EMAIL` | Yes | Bare email address on a Brevo-verified domain (e.g. `auth@your-domain.example`) |

Both are validated at startup in `src/server/config.ts`. The app refuses to boot if either is missing.

## Initial setup

### 1. Create a Brevo account

Sign up at <https://www.brevo.com>. Confirm the email address Brevo sends to verify the account.

### 2. Verify your sender domain

In the Brevo dashboard:

1. Navigate to **Senders, Domains & Dedicated IPs → Domains**.
2. Click **Add a Domain** and enter the domain you'll send from.
3. Add the SPF (TXT), DKIM (CNAME × 2), and DMARC (TXT, optional) records at your DNS provider.
4. Click **Authenticate this domain** in Brevo. Verification usually completes within a few minutes.

### 3. Generate an API key

In the Brevo dashboard: **SMTP & API → API Keys → Generate a new API key**. Copy the value into your environment as `BREVO_API_KEY`.

### 4. Configure environment variables

```
BREVO_API_KEY=<your-brevo-api-key>
FROM_EMAIL=auth@your-domain.example
```

`FROM_EMAIL` must be a bare address. The display name in the From header is hard-coded to `Covenant` in the API request body.

## How it works

`src/server/lib/auth.ts` defines a `sendBrevoEmail` helper that POSTs to `https://api.brevo.com/v3/smtp/email` with the API key in the `api-key` header. The Better Auth `magicLink` plugin's `sendMagicLink` callback calls this helper.

If the HTTP response is not 2xx, the helper throws with the response body. Better Auth surfaces the error to the client; the sign-up page (`src/app/(auth)/sign-up/page.tsx`) catches it and shows a toast. The auth middleware hook also logs `AUTH_FAILURE` events with the error message in production logs.

## Verification

After setup, test end-to-end:

1. Submit a sign-up with a real email address.
2. **Brevo dashboard → Logs → Email activity** should show a `delivered` event within seconds.
3. The recipient inbox receives the magic link.

If Brevo shows `delivered` but the inbox is empty, the issue is recipient-side filtering (Spam, Gmail Promotions tab) — not the application code.

## Free tier limits

| Metric | Limit |
| --- | --- |
| Daily send cap | 300 emails |
| Monthly cap | ~9,000 |
| Domain limit | Unlimited verified domains |

If sign-up volume ever approaches the daily cap, alternatives include Brevo paid plans, AWS SES, or ZeptoMail.
