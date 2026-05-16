# DDoS Protection

> **Version**: 0.1 (draft)
> **Status**: Proposed
> **Last Updated**: 2026-05-16
> **Source**: local code audit, confirmed production Upstash setup, Railway public networking docs, Cloudflare DDoS/WAF docs.

## Summary

Covenant has good **application abuse controls** for beta: Better Auth rate limits auth routes, tRPC mutations use Upstash-backed sliding-window limits, account lockout is Redis-backed, and Railway provides baseline network-level mitigation.

That is not full DDoS protection. Railway's public networking docs state that Railway mitigates attacks at network layer 4 and below, but does not provide application-layer protection. Covenant still needs an edge layer that can absorb and challenge HTTP floods before they reach the Next.js server.

Target architecture:

```text
Internet
  -> Cloudflare DNS/proxy
  -> Cloudflare DDoS + WAF + rate limiting + cache
  -> Railway public service
  -> Next.js app
  -> Upstash Redis rate-limit/session/lockout state
  -> Postgres
```

Cloudflare is the missing shield. Upstash remains the app-level fairness/abuse layer once requests reach the app.

## Goals

1. Put Cloudflare in front of the production domain with proxy enabled.
2. Block or challenge obvious Layer 7 floods before they hit Railway.
3. Add edge rate limits for the highest-risk routes: auth, tRPC, client logs, and health probes.
4. Cache safe public/static traffic at the edge to reduce origin load.
5. Keep authenticated app traffic correct: no caching of workspace/API responses.
6. Add monitoring and an incident runbook so attacks are visible and mitigations are adjustable under pressure.
7. Keep the plan cheap enough for beta, with clear upgrade points if traffic or attack pressure grows.

## Non-Goals

- Guarantee perfect DDoS immunity. No app can promise that, especially on commodity hosting.
- Move off Railway as part of this work.
- Replace Upstash rate limiting. Edge controls and app controls solve different layers.
- Add CAPTCHA to normal user flows by default. Managed challenges should only appear when behavior is suspicious.
- Build custom bot detection in application code.

## Current State

### Already in place

| Layer | Current protection | Notes |
| --- | --- | --- |
| Network / host | Railway baseline L4-and-below mitigation | Railway does not provide application-layer WAF protection. |
| Auth API | Better Auth rate limit in `src/server/lib/auth.ts` | Auth routes have stricter custom rules. |
| Account brute force | `src/server/lib/account-lockout.ts` | Production Upstash is configured, so lockout survives restarts and replicas. |
| tRPC writes | `rateLimit(RATE_LIMITS.*)` in routers | Mutations are mostly guarded. |
| Rate-limit store | Upstash Redis via `src/server/lib/rate-limiter.ts` | Confirmed configured correctly in production. |
| Security headers | `next.config.ts` | Good baseline, not DDoS-specific. |
| Health check | `/api/health` | Simple and cheap, but public. |

### Gaps

| Gap | Risk |
| --- | --- |
| No Cloudflare proxy/WAF in front of production | HTTP floods reach Railway and Next.js directly. |
| tRPC read queries are mostly not rate-limited | Authenticated attackers can repeatedly hit expensive read paths. |
| `/api/logs` is public and not rate-limited | Easy noisy write path into server logs. |
| Railway origin may remain directly reachable | Attackers can bypass Cloudflare if they know the Railway hostname. |
| No edge cache policy documented | Public static/landing traffic may consume origin capacity during bursts. |
| No attack runbook | Slower response when traffic spikes. |

## Phase 1 - Cloudflare Front Door

### DNS and proxy

Move the production app hostname to Cloudflare DNS and enable the orange-cloud proxy.

Required settings:

- SSL/TLS mode: **Full (strict)**.
- Minimum TLS version: **1.2**.
- Always Use HTTPS: **on**.
- HTTP Strict Transport Security: keep app-level HSTS; optionally enable Cloudflare HSTS after validating the domain setup.
- Proxy enabled only for production app host, e.g. `covenant.example.com`.

Acceptance:

1. `dig` resolves the app host to Cloudflare addresses, not Railway directly.
2. `curl -I https://<app-host>` shows Cloudflare response headers such as `cf-ray`.
3. Sign-in, Google OAuth callback, tRPC, static pages, and Sentry tunnel still work.
4. Railway health checks still pass.

### Origin bypass reduction

Railway's generated service URL can still be an origin bypass path. Reduce that risk as much as Railway allows.

Tasks:

- Check whether the public `*.up.railway.app` domain can be disabled for the production service.
- If it cannot be disabled, treat it as a residual risk and do not publish it.
- Add an app-level `HOST` allowlist check only if Railway health checks and preview environments can be excluded cleanly.
- Evaluate whether Cloudflare Tunnel or a future host migration is needed if origin bypass becomes a real attack vector.

Acceptance:

1. Production canonical domain works through Cloudflare.
2. Direct Railway hostname is disabled, blocked, or explicitly documented as residual risk.

## Phase 2 - Managed WAF and DDoS Rules

Enable Cloudflare protections in log/simulate mode first, then move to blocking/challenge mode after observing normal traffic.

Rulesets:

- Cloudflare HTTP DDoS Attack Protection: enabled.
- Cloudflare Managed Ruleset: enabled.
- OWASP Core Ruleset: enabled with a low-friction starting sensitivity.
- Bot Fight Mode or equivalent bot protection: enabled only if it does not disrupt auth/OAuth.

Custom WAF rules:

| Rule | Action | Reason |
| --- | --- | --- |
| Block non-GET/HEAD/POST methods globally | Block | Covenant does not need PUT/PATCH/DELETE at raw HTTP level for public routes. tRPC mutations use POST. |
| Block obvious scanner paths | Block | `/wp-admin`, `/xmlrpc.php`, `/.env`, `/.git`, common PHP paths. |
| Challenge suspicious countries/ASNs only during attack | Managed Challenge | Keep normal beta access open; use during incidents. |
| Challenge requests with missing/empty User-Agent to API paths | Managed Challenge or block | Most real browsers and clients send a UA. |
| Block oversized request bodies where possible | Block | Protect JSON endpoints from cheap bandwidth/CPU abuse. |

Acceptance:

1. Normal browser session is not challenged.
2. OAuth redirects complete.
3. Auth and tRPC calls work from the production UI.
4. Scanner-path requests are blocked at Cloudflare before origin.
5. Cloudflare Security Events show rule matches.

## Phase 3 - Edge Rate Limits

Cloudflare rate limits should protect origin capacity. Upstash limits should still enforce user/IP fairness inside the app.

Initial Cloudflare route rules:

| Route | Suggested limit | Action | Notes |
| --- | ---: | --- | --- |
| `/api/auth/*` | 20 requests / 10 seconds / IP | Managed Challenge, then block | Better Auth has stricter internal limits; edge limit absorbs floods. |
| `/api/auth/sign-in/*` | 5 requests / 60 seconds / IP | Managed Challenge | Avoid breaking legitimate retries too aggressively. |
| `/api/auth/request-password-reset*` | 3 requests / 10 minutes / IP | Managed Challenge or block | Protect email provider and account discovery surface. |
| `/api/trpc/*` | 120 requests / 60 seconds / IP | Managed Challenge | Broad safety valve for API floods. |
| `/api/trpc/*` with 401/403/429 responses | 30 responses / 60 seconds / IP | Block for 10 minutes | Punish repeated bad/limited API traffic. |
| `/api/logs` | 10 requests / 60 seconds / IP | Block | Public write endpoint; should be low-volume. |
| `/api/health` | 60 requests / 60 seconds / IP | Block | Railway probes should not come through the public domain often. |
| `/_next/static/*` | no challenge | Allow/cache | Static assets should stay cheap and cacheable. |

During beta, start with logging/challenge actions rather than hard blocks for broad API rules. Tighten after one week of production traffic.

Acceptance:

1. Repeated auth attempts trigger Cloudflare before app-level limits become the only defense.
2. `/api/logs` flood is blocked at edge.
3. Normal app navigation does not trip `/api/trpc/*` limits.
4. Cloudflare analytics show origin request reduction during synthetic bursts.

## Phase 4 - Application Hardening

Cloudflare absorbs floods, but the app should still fail cheaply once traffic reaches it.

### Rate-limit public route handlers

Add Upstash-backed limits to non-tRPC route handlers:

- `src/app/api/logs/route.ts`: use `checkRateLimit(ip, RATE_LIMITS.strict)` or a dedicated `clientLogs` limit.
- `src/app/api/health/route.ts`: optionally no-op for Railway health checks, but rate-limit public-domain abuse if `Host` is the production domain.

Acceptance:

1. `/api/logs` returns `429` after the configured app limit.
2. Tests cover valid logs, invalid logs, and rate-limited logs.

### Add read-query limits for expensive tRPC paths

Mutation limits are already broad. Add limits to expensive reads where repeated calls can hit the database hard.

Candidates:

- `dashboard.get`
- `journaling.getAll`
- `journaling.getMoodCalendar`
- `quest.getTacticalState`
- `guilds.getMessages`
- `guilds.getCampaignHistory`
- `killRecord.getKillRecord`
- `tasks.getFiltered`

Suggested config:

```ts
export const RATE_LIMITS = {
  auth: { windowMs: 60_000, maxRequests: 5 },
  read: { windowMs: 60_000, maxRequests: 120 },
  expensiveRead: { windowMs: 60_000, maxRequests: 30 },
  write: { windowMs: 60_000, maxRequests: 30 },
  strict: { windowMs: 60_000, maxRequests: 10 },
  combat: { windowMs: 60_000, maxRequests: 60 }
} as const
```

Acceptance:

1. Expensive reads return `TOO_MANY_REQUESTS` after repeated calls.
2. Existing dashboard/task/journal/guild tests still pass.
3. Limits are high enough not to affect ordinary TanStack Query refetch behavior.

### Make IP extraction proxy-aware

`src/server/context.ts` already prefers `x-real-ip`, `cf-connecting-ip`, then `x-forwarded-for`. Once Cloudflare is the front door, prefer `cf-connecting-ip` first for the production host.

Acceptance:

1. Cloudflare traffic keys rate limits by real client IP.
2. Local dev and Railway health checks still produce a usable IP or fail open intentionally.

## Phase 5 - Caching Policy

Cache only safe public assets and public marketing/document pages. Never cache authenticated workspace or API responses.

Cloudflare cache rules:

| Path | Policy |
| --- | --- |
| `/_next/static/*` | Cache everything, long TTL, respect immutable assets. |
| `/images/*`, `/favicon.ico`, static public assets | Cache everything, long TTL. |
| Landing/news/mechanics/roadmap/static MDX routes | Cache eligible GET/HEAD if response is public and has no auth cookies. |
| `/api/*` | Bypass cache. |
| `/dashboard`, `/tasks`, `/habits`, `/objectives`, `/journal`, `/inventory`, `/quests`, `/guilds`, `/settings` | Bypass cache. |
| Sentry tunnel `/monitoring` | Bypass cache. |

Acceptance:

1. Static assets show `cf-cache-status: HIT` after warmup.
2. Authenticated workspace pages never show cached private data across users.
3. API responses are never cached.

## Phase 6 - Observability and Runbook

### Dashboards

Track:

- Cloudflare requests by path, status, country, ASN, bot score if available.
- Cloudflare WAF/rate-limit actions.
- Railway request rate, CPU, memory, restarts, response time.
- App `TOO_MANY_REQUESTS` count from tRPC and route handlers.
- Upstash command usage and rate-limit key volume.
- Postgres CPU/connections/slow queries.

### Alerts

Create alerts for:

- Origin requests > normal baseline for 5 minutes.
- 5xx rate > 2% for 5 minutes.
- Cloudflare blocked/challenged requests spike.
- Railway restarts or memory near limit.
- Upstash free-tier command burn rate approaching daily limit.
- Postgres connection saturation.

### Incident runbook

1. Confirm whether traffic is hitting Cloudflare or bypassing origin.
2. Enable Cloudflare "Under Attack" mode only if normal WAF/rate limits are insufficient.
3. Tighten `/api/trpc/*`, `/api/auth/*`, and `/api/logs` rate limits.
4. Add temporary ASN/country/path challenges based on Cloudflare Security Events.
5. If origin bypass is active, rotate/remove exposed hostnames if possible and contact Railway support.
6. If app CPU is the bottleneck, temporarily scale Railway replicas and keep Upstash enabled.
7. After the incident, export traffic/rule data and tune permanent rules.

Acceptance:

1. One-page runbook exists in `docs/runbooks/ddos_incident.md` or this spec is promoted into one.
2. At least one synthetic burst test has screenshots/notes showing Cloudflare blocking before Railway saturation.

## Implementation Checklist

### Must do before beta opens wider

- [ ] Enable Cloudflare proxy for production app domain.
- [ ] Enable Cloudflare HTTP DDoS managed protection.
- [ ] Enable Cloudflare Managed Ruleset and OWASP ruleset in observe/log mode.
- [ ] Add Cloudflare rate-limit rules for `/api/auth/*`, `/api/trpc/*`, `/api/logs`, and `/api/health`.
- [ ] Cache `/_next/static/*` and public assets.
- [ ] Explicitly bypass cache for `/api/*` and workspace routes.
- [ ] Add app-level rate limiting to `/api/logs`.
- [ ] Verify production rate limits use Upstash after Cloudflare is enabled.
- [ ] Document whether the Railway origin hostname can be disabled.

### Should do soon after

- [ ] Add `RATE_LIMITS.read` and `RATE_LIMITS.expensiveRead`.
- [ ] Apply expensive-read limits to dashboard, journal, guild, quest, kill-record, and filtered task endpoints.
- [ ] Prefer `cf-connecting-ip` in production IP extraction once Cloudflare is mandatory.
- [ ] Add Cloudflare/Railway/Upstash alert thresholds.
- [ ] Write `docs/runbooks/ddos_incident.md`.

### Upgrade path if attacks become serious

- [ ] Move to Cloudflare paid plan if needed for stronger WAF/rate-limit controls.
- [ ] Investigate origin isolation: Cloudflare Tunnel, host migration, or a platform that supports strict origin allowlisting/authenticated origin pulls.
- [ ] Add queueing/backpressure for write-heavy endpoints.
- [ ] Add database connection pooling and per-query timeout review.
- [ ] Consider separating public marketing pages from authenticated app origin.

## Open Questions

1. Can the Railway-generated public domain be disabled for the production service?
2. Which Cloudflare plan is the project on, and which WAF/rate-limit features are available at that plan?
3. Are Railway preview environments also behind Cloudflare, or intentionally direct?
4. Do we want `/api/logs` at all long-term, or should client logs go directly to Sentry/PostHog?
5. Should `/api/health` require a secret header for non-Railway callers, or stay public for uptime checks?

## References

- Railway public networking specs and DDoS note: https://docs.railway.com/networking/public-networking/specs-and-limits
- Cloudflare DDoS attack coverage: https://developers.cloudflare.com/ddos-protection/about/attack-coverage/
- Cloudflare WAF rate limiting rules: https://developers.cloudflare.com/waf/rate-limiting-rules/
- Cloudflare authenticated origin pulls: https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/
- Cloudflare cache docs: https://developers.cloudflare.com/cache/get-started/
