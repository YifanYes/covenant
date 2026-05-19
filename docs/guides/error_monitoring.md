# Error Monitoring (Sentry)

Covenant captures production errors via [Sentry](https://sentry.io) for both server (tRPC / Node.js / Edge) and client (React / Next.js).

## Required environment variables

| Variable                                  | Runtime         | Required in prod? | Description                                                    |
| ----------------------------------------- | --------------- | ----------------- | -------------------------------------------------------------- |
| `SENTRY_DSN`                              | Server / Edge   | Yes               | Server-side and edge error ingestion DSN                       |
| `NEXT_PUBLIC_SENTRY_DSN`                  | Client          | Yes               | Browser error ingestion DSN                                    |
| `SENTRY_ORG`                              | Build           | Yes (prod)        | Sentry organization slug, used for source-map upload           |
| `SENTRY_PROJECT`                          | Build           | Yes (prod)        | Sentry project slug, used for source-map upload                |
| `SENTRY_AUTH_TOKEN`                       | Build           | Yes (prod)        | Build-time auth token (do not commit)                          |
| `NODE_ENV`                                | All             | No                | Defaults Sentry environment to `development` / `production`    |
| `ENVIRONMENT` / `NEXT_PUBLIC_ENVIRONMENT` | Server / Client | No                | Override `NODE_ENV` in Sentry tags (e.g. `staging`, `preview`) |

In `next.config.ts`, the build throws if `SENTRY_ORG` is missing in production — there is no fallback slug, so each deployment must set its own.

In dev, `SENTRY_ORG` is optional; without it the Sentry plugin skips source-map upload.

## Setting up Sentry

1. Create a Sentry account at <https://sentry.io>.
2. Create an organization (the slug becomes `SENTRY_ORG`, e.g. `<your-org>`).
3. Create a project of type **Next.js** (the slug becomes `SENTRY_PROJECT`, e.g. `<your-project>`).
4. Copy the DSN from project settings into both `SENTRY_DSN` (server) and `NEXT_PUBLIC_SENTRY_DSN` (client).
5. Generate an auth token (organization scope: `project:write`) and store as `SENTRY_AUTH_TOKEN`. Do not commit.

## Files involved

| File                                                  | Purpose                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------- |
| `instrumentation-client.ts`                           | Browser SDK init                                                 |
| `sentry.server.config.ts`                             | Node.js SDK init                                                 |
| `sentry.edge.config.ts`                               | Edge runtime SDK init                                            |
| `sentry.shared.config.ts`                             | Shared config for server + edge                                  |
| `instrumentation.ts`                                  | Loads correct config based on `NEXT_RUNTIME`                     |
| `next.config.ts`                                      | Wraps export with `withSentryConfig`                             |
| `src/app/api/trpc/[...trpc]/route.ts`                 | tRPC `onError` handler — sends `INTERNAL_SERVER_ERROR` to Sentry |
| `src/components/common/sentry-provider.component.tsx` | React `ErrorBoundary` for unhandled client errors                |

## How it works

### Server (tRPC)

The tRPC fetch handler's `onError` callback captures unwrapped `INTERNAL_SERVER_ERROR` causes only. `BAD_REQUEST`, `UNAUTHORIZED`, `TOO_MANY_REQUESTS`, etc. are not sent — they are expected protocol-level errors and would create noise.

### Client (React)

`SentryProvider` wraps the app in Sentry's `ErrorBoundary`. On render-time crash, the error is reported, a themed fallback UI shows, and the user can retry rendering.

### Sampling

- **Traces:** `1.0` in dev, `0.1` in prod
- **Replays on error:** `1.0` in dev, `0.1` in prod
- **Session replays:** disabled (privacy)
- **Send PII:** prod only

### beforeSend filter

Events are dropped entirely in non-production environments by skipping `Sentry.init` when `NODE_ENV !== 'production'`, so local dev never spams Sentry.

In production, `sendDefaultPii: true` is enabled (required for source-map symbolication and useful context like user-scoped issues), but the `scrubPii` `beforeSend` hook in `sentry.shared.config.ts` runs on every event to strip identifiers before transport:

- **`event.user`** — reduced to `{ id }` only. Email, username, and `ip_address` are removed.
- **`event.request.cookies`** — cleared.
- **`event.request.headers`** — `cookie`, `set-cookie`, `authorization`, `proxy-authorization`, `x-forwarded-for`, `x-real-ip`, and `forwarded` headers are removed (case-insensitive).
- **`event.request.data`** — replaced with `'[Filtered]'` to avoid leaking request bodies.

The same `scrubPii` function is imported by `instrumentation-client.ts` so server, edge, and browser events all go through the same filter. When adjusting the scrubber, update both call sites by editing the shared helper.

## Verification

1. **SDK loads.** Browser console: `Sentry.getCurrentHub().getClient().getOptions()` — should show DSN and sample rates.
2. **Server test error.** Temporarily add `publicProcedure.query(() => { throw new Error('test') })`. Call it. Check Sentry Issues.
3. **Client test error.** Add `function Boom() { throw new Error('test') }`. Mount it. Confirm fallback UI; verify the issue in Sentry.

## Without Sentry (local dev)

If you don't set any Sentry variables:

- Server errors are logged by Pino as usual
- Client errors fall back to the browser console
- The `beforeSend` filter drops events before they leave the browser
- Builds succeed without `SENTRY_ORG` / `SENTRY_PROJECT` (the plugin runs silently)

## Troubleshooting

| Symptom                                      | Fix                                                                                   |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `SENTRY_ORG required in production` at build | Set `SENTRY_ORG` (and the rest) in your host's environment                            |
| Source-maps not uploaded                     | Confirm `SENTRY_ORG`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN` are set at build time |
| tRPC errors not appearing                    | Only `INTERNAL_SERVER_ERROR` with a `.cause` is captured; check the error code        |
| Client boundary not catching                 | `<SentryProvider>` must be mounted **outside** any component that might crash         |
| Too much noise                               | Lower `tracesSampleRate` and `replaysOnErrorSampleRate` in the shared config          |

## Related docs

- `docs/guides/deployment.md` — host setup
- `AGENTS.md` — build commands and deployment flow
