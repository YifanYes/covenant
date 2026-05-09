# Redis Setup (Upstash)

> **Scope**: Auth rate limiting, Better Auth session storage, account-lockout state
> **Last Updated**: 2026-05-09

---

## What Redis Is Used For

Covenant uses Upstash Redis (REST-based, serverless) as shared, durable state for three subsystems. All three degrade to per-replica in-memory state when Redis is absent — the app still boots, but state no longer survives restarts or crosses replicas.

| Subsystem                                                           | Purpose                                              | Fallback when Redis is null    |
| ------------------------------------------------------------------- | ---------------------------------------------------- | ------------------------------ |
| Better Auth `secondaryStorage`                                      | Sessions, rate-limit counters, password-reset tokens | In-memory per replica          |
| `RateLimiter` / `checkRateLimit` (`src/server/lib/rate-limiter.ts`) | Custom sliding-window limits keyed by IP             | `Map`-backed in-memory limiter |
| Account lockout (`src/server/lib/account-lockout.ts`)               | Failed-attempt counter + lock TTL per email hash     | `Map`-backed in-memory store   |

Without Redis on a multi-replica deploy, an attacker can rotate replicas to bypass per-instance counters. **Production must have Redis configured.**

---

## Required Environment Variables

```bash
UPSTASH_REDIS_REST_URL=https://<region>-<id>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
```

| Variable                   | Required in prod? | Description                                                 |
| -------------------------- | ----------------- | ----------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`   | Yes               | REST endpoint for the Upstash database                      |
| `UPSTASH_REDIS_REST_TOKEN` | Yes               | Read/write token (the default `Token`, not a read-only one) |

If either is missing, `src/server/lib/redis.ts` returns `null` and all three subsystems silently fall back to in-memory state. In production, a warning is logged once at boot.

---

## Provisioning Upstash

1. Sign in at [console.upstash.com](https://console.upstash.com).
2. **Create Database** → choose:
   - **Type**: Regional (Global is fine too; Regional is cheaper and lower-latency if your Railway region is fixed)
   - **Region**: same region as the Railway service (e.g., `us-east-1`)
   - **TLS**: enabled
   - **Eviction**: `allkeys-lru` recommended (rate-limit / lockout keys are TTL'd, but eviction protects against runaway growth)
3. After creation, open the database → **REST API** tab.
4. Copy:
   - `UPSTASH_REDIS_REST_URL` (looks like `https://us1-xyz.upstash.io`)
   - `UPSTASH_REDIS_REST_TOKEN` (the default token, not the read-only one)
5. Paste both into `.env.local` for development and into Railway → service → **Variables** for each environment (production + preview).

> **Preview environments**: Railway PR previews share the same Upstash database by default. If you want isolation, create a second Upstash database and point preview env vars at it; otherwise tests on PR previews can pollute prod rate-limit / lockout state.

---

## Files Involved

| File                                | Purpose                                                              |
| ----------------------------------- | -------------------------------------------------------------------- |
| `src/server/lib/redis.ts`           | Constructs the singleton `Redis` client, returns `null` if env unset |
| `src/server/lib/rate-limiter.ts`    | `checkRateLimit` — Upstash sliding window with in-memory fallback    |
| `src/server/lib/account-lockout.ts` | Per-email failure counter + lock TTL with in-memory fallback         |
| `src/server/lib/auth.ts`            | Wires Redis as Better Auth `secondaryStorage`                        |

---

## Key Layout in Redis

| Prefix                             | Source                           | TTL                                     |
| ---------------------------------- | -------------------------------- | --------------------------------------- |
| `covenant_rl:*`                    | Upstash Ratelimit sliding window | Window length (sec)                     |
| `covenant:lockout:fails:<sha256>`  | Account lockout failure counter  | 24h, refreshed on first fail per window |
| `covenant:lockout:locked:<sha256>` | Active lock with `lockedUntil`   | Backoff (60s → 3600s)                   |
| `<better-auth defaults>`           | Sessions, rate limits, tokens    | Set by Better Auth                      |

Emails are SHA-256 hashed before being used in lockout keys — raw addresses never hit Redis.

---

## Local Development

Two options:

**A. Use a personal Upstash database.** Free tier is more than enough; same setup as above. Recommended if you want behavior parity with production.

**B. Skip Redis.** Leave `UPSTASH_REDIS_REST_URL` / `_TOKEN` unset. The app uses in-memory fallbacks. Sufficient for most feature work; the only things you can't test locally are:

- Multi-replica state sharing (irrelevant on `pnpm dev`)
- Lockout / rate-limit persistence across restarts
- Better Auth session survival across server restarts

---

## Verifying the Integration

### 1. Confirm the client connected

Boot the dev server with both env vars set. In production-mode logs, the absence of this warning means Redis is wired up:

```
UPSTASH_REDIS_REST_URL/TOKEN not set in production — rate limits and Better Auth secondaryStorage will use in-memory state per replica
```

### 2. Hit the rate limit

```bash
for i in {1..10}; do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    http://localhost:3000/api/auth/sign-in/email \
    -H 'content-type: application/json' \
    -d '{"email":"nobody@example.com","password":"x"}'
done
```

After 3 attempts in 10s you should see `429`. With Redis configured, restarting the dev server does **not** reset the counter; without Redis, it does.

### 3. Trigger account lockout

5 bad-password attempts against a real account return `401`; the 6th onwards return `429` with `Retry-After`. Inspect the keys directly:

```bash
# From Upstash console → Data Browser → search prefix:
covenant:lockout:locked:
```

### 4. Inspect Better Auth keys

Sessions land under Better Auth's default prefix. After signing in, check the Data Browser for entries created in the last few seconds.

---

## Pricing

Upstash bills per-request, not per-instance.

| Tier              | Price             | Daily commands | Storage | Notes                               |
| ----------------- | ----------------- | -------------- | ------- | ----------------------------------- |
| **Free**          | $0                | 10,000 / day   | 256 MB  | Fine for dev + small prod           |
| **Pay-as-you-go** | $0.20 / 100K cmds | Unlimited      | 1 GB    | Recommended once you exit free tier |
| **Pro**           | from $280/mo      | Unlimited      | 50 GB+  | Dedicated, multi-region             |

For Covenant: rate-limit + lockout traffic is a few commands per auth request. At ~1k auth requests/day you're well inside free tier; budget $1–5/month at low-thousands DAU.

---

## Troubleshooting

| Symptom                                                                                 | Fix                                                                                         |
| --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| "rate limits and Better Auth secondaryStorage will use in-memory state" warning in prod | Env vars not loaded — check Railway service variables                                       |
| `401 Unauthorized` from Upstash                                                         | Token mismatch; copy the **default** token, not the read-only one                           |
| Rate limits reset on every deploy                                                       | Redis not connected — see warning above                                                     |
| Lockout never triggers                                                                  | Confirm `UPSTASH_REDIS_REST_URL` / `_TOKEN` set; the in-memory store works per-replica only |
| `LOCKOUT_CHECK_FAILED` in logs                                                          | Upstash unreachable; auth fails open intentionally — investigate Upstash availability       |
| Keys piling up                                                                          | Set eviction policy to `allkeys-lru` on the database                                        |

---

## Related Docs

- `docs/guides/railway_deployment.md` — Where to set Railway env vars per environment
- `AGENTS.md` — Verification order (`pnpm lint` / `tsc` / `pnpm test:run`) before push
