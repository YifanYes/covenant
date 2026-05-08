# Sentry Error Monitoring Setup

> **Scope**: Backend (tRPC / Node.js / Edge) and frontend (React / Next.js) error tracking
> **Last Updated**: 2026-05-08

---

## What Was Added

Covenant now captures production errors via [Sentry](https://sentry.io) for both the server and the client. No third-party service was configured before this change, so production crashes were invisible.

---

## Required Environment Variables

Copy these into your `.env.local` (and set them in Railway / production):

| Variable                    | Runtime       | Required in prod? | Description                                                      |
| --------------------------- | ------------- | ----------------- | ---------------------------------------------------------------- |
| `SENTRY_DSN`                | Server / Edge | Yes               | Private DSN for server-side and edge error ingestion             |
| `NEXT_PUBLIC_SENTRY_DSN`    | Client        | Yes               | Public DSN for browser error ingestion                           |
| `SENTRY_ORG`                | Build         | No\*              | Sentry organization slug (used only for sourcemap upload)        |
| `SENTRY_PROJECT`            | Build         | No\*              | Sentry project slug (used only for sourcemap upload)             |
| `NODE_ENV`                  | All           | No                | Defaults Sentry environment to `development` / `production`      |
| `ENVIRONMENT`               | Server / Edge | No                | Overrides `NODE_ENV` in Sentry tags (e.g. `staging`, `preview`)  |
| `NEXT_PUBLIC_ENVIRONMENT`   | Client        | No                | Client-side override for `NODE_ENV` in Sentry tags               |

> **Note**: `SENTRY_ORG` and `SENTRY_PROJECT` are only needed if you want Sentry to upload sourcemaps during the Next.js build. The SDK itself works fine with just the DSN.

---

## Files Involved

| File                                                  | Purpose                                                                      |
| ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `instrumentation-client.ts`                           | Initializes the browser SDK                                                  |
| `sentry.server.config.ts`                             | Initializes the Node.js SDK                                                  |
| `sentry.edge.config.ts`                               | Initializes the Edge runtime SDK                                             |
| `sentry.shared.config.ts`                             | Shared base config used by server and edge configs                           |
| `instrumentation.ts`                                  | Loads the correct Sentry config based on `NEXT_RUNTIME`                      |
| `next.config.ts`                                      | Wraps the export with `withSentryConfig` for webpack integration             |
| `src/app/api/trpc/[...trpc]/route.ts`                 | tRPC `onError` handler that sends `INTERNAL_SERVER_ERROR`s to Sentry         |
| `src/components/common/sentry-provider.component.tsx` | React `ErrorBoundary` that wraps the app and reports unhandled client errors |
| `src/app/layout.tsx`                                  | Mounts `<SentryProvider>` around the entire tree                             |

---

## How It Works

### Server (tRPC)

The tRPC fetch handler (`route.ts`) includes an `onError` callback. When a procedure throws an `INTERNAL_SERVER_ERROR` that is **not** just a wrapped `TRPCError`, the original cause is captured:

- User context (`userId`, `email`) is attached when available
- `trpc.path` and `trpc.code` tags are set
- `Sentry.captureException(error.cause)` sends the event

Non-internal errors (`BAD_REQUEST`, `UNAUTHORIZED`, `TOO_MANY_REQUESTS`, etc.) are **not** sent to Sentry to avoid noise.

### Client (React)

The `SentryProvider` component wraps the app in Sentry's `ErrorBoundary`. If a React component crashes:

- The error is automatically reported to Sentry
- A themed fallback UI is shown ("The realm has encountered a calamity")
- The user can click **Attempt Resurrection** to retry rendering

### Next.js Instrumentation

`instrumentation.ts` uses `process.env.NEXT_RUNTIME` to load the correct config:

- `'nodejs'` → `sentry.server.config.ts`
- `'edge'` → `sentry.edge.config.ts`

It also exports `onRequestError = Sentry.captureRequestError` so Next.js can report request-level failures (e.g., middleware crashes, API route uncaught exceptions).

---

## Configuration Details

### Sampling Rates

All three configs use the same logic:

- **Traces**: `1.0` in development, `0.1` in production
- **Replays on error**: `1.0` in development, `0.1` in production
- **Session replays**: `0` (disabled to avoid privacy issues)
- **Send PII**: enabled only in production

### beforeSend Filter

Events are silently dropped when no DSN is configured **and** `NODE_ENV` is not `production`. This means local development does not spam Sentry (or fail) if you haven't set a DSN yet.

---

## Verifying the Integration

### 1. Check that the SDK loads

Start the dev server and open the browser console. Run:

```js
Sentry.getCurrentHub().getClient().getOptions()
```

You should see the DSN and sample rates.

### 2. Trigger a test server error

Temporarily add a throwing route or tRPC procedure:

```ts
publicProcedure.query(() => {
  throw new Error('Sentry test — please ignore')
})
```

Call it and check the Sentry Issues dashboard.

### 3. Trigger a test client error

Add a component that throws on render:

```tsx
function Boom() {
  throw new Error('Sentry client test — please ignore')
}
```

Mount it, confirm the fallback UI appears, and verify the issue in Sentry.

---

## Local Development Without Sentry

If you do **not** set any Sentry variables, the app works normally:

- Server errors are still logged by Pino
- Client errors fall back to the browser console
- The `beforeSend` filter drops Sentry events before they leave the browser
- Builds succeed even without `SENTRY_ORG` / `SENTRY_PROJECT` (the webpack plugin runs silently)

---

## Pricing

As of 2025, Sentry offers a **Developer (Free)** tier that covers most early-stage projects:

| Tier           | Price   | Errors / month | Performance units | Replays | Users     |
| -------------- | ------- | -------------- | ----------------- | ------- | --------- |
| **Developer**  | Free    | 5,000          | 10M               | 50      | 1         |
| **Team**       | ~$26/mo | 50,000         | 100M              | 500     | Unlimited |
| **Business**   | ~$80/mo | 50,000         | 100M              | 5,000   | Unlimited |
| **Enterprise** | Custom  | Custom         | Custom            | Custom  | Custom    |

**What counts as an "error"?**

- Each unique exception event sent to Sentry consumes 1 error quota
- The same stack trace deduplicated across users still counts as **one** issue, but each occurrence consumes quota
- Performance units are consumed by spans/traces (sampled at 10% in production, so 10M units go a long way)

**For Covenant specifically:**

- With ~10 active users and `tracesSampleRate: 0.1`, the free tier is more than enough
- If you outgrow 5k errors/month, you can either increase sampling discipline or upgrade to Team
- Replays are disabled by default (`replaysSessionSampleRate: 0`) to avoid unexpected quota drain

---

## Troubleshooting

| Symptom                                | Fix                                                                                |
| -------------------------------------- | ---------------------------------------------------------------------------------- |
| "DSN not configured" warnings in build | Set `SENTRY_DSN` and `NEXT_PUBLIC_SENTRY_DSN` in environment                       |
| Sourcemaps not uploaded                | Ensure `SENTRY_ORG` and `SENTRY_PROJECT` are set at build time                     |
| tRPC errors not appearing              | Only `INTERNAL_SERVER_ERROR` with a `.cause` is captured; check the error code     |
| Client boundary not catching           | Make sure `<SentryProvider>` is mounted **outside** any component that might crash |
| Too much noise in Sentry               | Lower `tracesSampleRate` and `replaysOnErrorSampleRate` in the config files        |

---

## Related Docs

- `docs/specs/logging.md` — Structured logging with Pino (complements Sentry for log aggregation)
- `AGENTS.md` — Build commands and deployment flow
