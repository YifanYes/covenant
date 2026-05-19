# Hetzner + Coolify Migration

> **Version**: 0.1 (draft)
> **Status**: Proposed
> **Last Updated**: 2026-05-19
> **Source**: local code audit (`railway.toml`, `package.json`, `src/server/lib/redis.ts`, `src/server/lib/rate-limiter.ts`, `prisma/schema.prisma`, `next.config.ts`), Hetzner Cloud pricing post-April-2026 increase, Coolify v4 docs, Cloudflare TOS 2.8, ICANN Transfer Policy.

## Summary

Covenant currently runs on Railway: Next.js 16 web service + Postgres + Upstash Redis, domain bought through Railway's reseller, GitHub auto-deploy on push. Monthly spend is in the **$20–40** range on the Hobby plan.

This spec proposes migrating to a **single Hetzner CAX11 VPS in Falkenstein (FSN1)**, running **Coolify v4** as a self-hosted PaaS, with **Postgres and Redis containers on the same box**, **Cloudflare** in front for DNS + proxy + SSL + DDoS, and **GitHub auto-deploys** via Coolify webhook. The domain is transferred away from Railway's reseller to **Porkbun** (or Cloudflare Registrar) before DNS cutover.

Target architecture:

```text
Internet
  -> Cloudflare DNS + proxy (SSL Full strict, WAF, DDoS)
  -> Hetzner CAX11 VPS (FSN1, Falkenstein)
     -> Coolify v4 + Traefik (Let's Encrypt)
        -> Next.js standalone container        (:3000)
        -> Postgres container, localhost only  (:5432)
        -> Redis container, localhost only     (:6379)
GitHub push -> Coolify webhook (HMAC) -> rebuild + zero-downtime swap
Daily pg_dump -> Backblaze B2 (encrypted, second line beyond Coolify backup)
```

Estimated total: **~€6/mo**, vs ~$20–40 on Railway. Savings are real (≈70–85%) but the **primary motivation is hands-on DevOps learning** — Docker, Traefik, Let's Encrypt, Postgres ops, SSH hardening, Cloudflare proxy, GitHub webhooks. Cost savings are secondary.

## Goals

1. Match current Railway functionality: Next.js web + Postgres + Redis, SSL, GitHub-driven deploys on push to `main`, health checks.
2. Reduce monthly hosting spend by 50–70% with predictable pricing (no usage-based surprises).
3. Build operational fluency end-to-end: provisioning, hardening, container orchestration, reverse-proxy + automatic TLS, database backups + restore drills, edge proxy via Cloudflare, webhook security.
4. Produce a runbook good enough that a non-expert (i.e. the author) can recover from a box loss within hours.
5. Keep all external service integrations untouched: Sentry (errors), Brevo (transactional email), Google OAuth (Better Auth).

## Non-Goals

- HA, multi-region, or zero-downtime guarantees. Single VPS is acceptable — the app has no users yet.
- Replace Sentry, Brevo, or Google OAuth. Those stay external.
- Self-host email. Brevo's free tier (300/day) covers expected volume for the foreseeable future.
- Rewrite the app or change the `prisma db push` workflow used by `railway.toml` today. Tracked as a follow-up; out of scope for this migration.
- Provide a staging environment in the first cutover. Single-environment is fine; staging can be added on a second tiny VPS later.

## Current State (Railway)

| Concern | Today on Railway |
| --- | --- |
| Web | Next.js 16, Node 24, pnpm 11. `railway.toml` uses `railpack` Node buildpack. Start: `pnpm start`. |
| DB | Managed Postgres add-on. Startup runs `pnpm prisma db push` to sync schema. |
| Cache / rate limits | Upstash Redis via REST: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`. Used by `src/server/lib/rate-limiter.ts` and Better Auth session fallback. |
| SSL / DNS | Railway-provisioned cert; domain bought via Railway's third-party registrar. |
| Deploys | GitHub push to `main` triggers Railway build & deploy. |
| Health | `/api/health` endpoint, configured in `railway.toml`. |
| Monthly cost | Hobby plan $5 base + usage. Observed: **~$20–40/mo** depending on activity. |
| File storage | None. JSON blobs in Postgres (inventory, loadout, combat state, journal HTML). |
| Workers / cron | None active. `node-cron` is installed but no jobs registered. |

## Target Architecture

### Components

**Cloudflare (free tier)** sits at the edge. DNS, proxy (orange cloud), free SSL termination, automatic DDoS at L3/L4, optional WAF managed rules, optional Bot Fight Mode. SSL mode is **Full (strict)** with a Let's Encrypt cert on the origin. Cloudflare TOS section 2.8 restricts caching disproportionate non-HTML; proxying HTML and API responses is fine.

**Hetzner CAX11 (Ampere Arm64, 2 vCPU / 4 GB / 40 GB NVMe / 20 TB egress)** in **FSN1 Falkenstein** at **~€3.79/mo** post-April-2026 price increase. Closest Hetzner EU region to Madrid (~25 ms RTT). Arm is chosen because Coolify, Next.js, Postgres, and Redis all run cleanly on Arm64 and Arm is consistently the cheapest tier. The app has no users; idle footprint (Coolify ~500 MB + Postgres ~300 MB + Redis ~50 MB + Next.js prod ~400 MB) leaves ~2 GB headroom on a 4 GB box. Next.js production builds can spike past 4 GB, so we pre-allocate a 4 GB swapfile on the NVMe to absorb build-time peaks. Upgrade paths if that proves insufficient: CAX21 (4 vCPU / 8 GB / 80 GB Arm, ~€7.59/mo) for more headroom on box, or move builds to GitHub Actions and push the image to Coolify's registry so the VPS only runs containers.

**Coolify v4** (self-hosted, MIT-ish license, install via `curl … | bash` from coolify.io). Provides: GitHub auto-deploy with webhook + HMAC, Next.js auto-detection of standalone builds, one-click Postgres and Redis containers, Let's Encrypt SSL via built-in Traefik, env vars + secrets, live build/runtime logs, S3-compatible backups, optional separate Build Server. Idle footprint ~1 GB RAM. Patch promptly — Coolify ships several CVE patches per month.

**Postgres container** managed by Coolify. Volume-mounted to a Hetzner Volume (or to the VPS disk for v0.1). Bound to `127.0.0.1` only; the app reaches it via Docker network. Daily backup to Backblaze B2 via Coolify's S3 target, plus a redundant `pg_dump | gzip | b2 upload` cron as a second line.

**Redis container** managed by Coolify. Bound to `127.0.0.1` only. **Replaces Upstash.** App env vars change from `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` to a standard `REDIS_URL=redis://redis:6379` — `src/server/lib/redis.ts` and `src/server/lib/rate-limiter.ts` need a small refactor to use a regular Redis client (e.g. `ioredis`) instead of the Upstash REST client. Tracked under "App-side changes" below.

**GitHub** webhook on push to `main` → Coolify endpoint → image build → zero-downtime swap behind Traefik.

### App-side changes required

These are the only code/config changes induced by the migration. They go in a separate PR alongside the infra work, not in this spec PR.

1. Replace Upstash REST client in `src/server/lib/redis.ts` with `ioredis` (or `node-redis`). Wire `REDIS_URL` env var.
2. Update `src/server/lib/rate-limiter.ts` to use the new client. Sliding-window logic is unchanged.
3. Confirm Better Auth's Redis session storage points to the same client.
4. Add a `Dockerfile` (multi-stage: deps → build → runner) using Next.js standalone output. Set `output: 'standalone'` in `next.config.ts`.
5. Remove `railway.toml`. Replace start command logic — `prisma db push` runs as part of the Coolify "Pre-deployment Command" or in a startup script in the image.
6. Add `.dockerignore` for `node_modules`, `.next`, `.git`, `.env*`.

### Sizing & region rationale

| Plan | vCPU / RAM / Disk | Price (EU) | Notes |
| --- | --- | --- | --- |
| **CAX11 (Arm, FSN1)** | 2 / 4 GB / 40 GB | ~€3.79/mo | **Recommended.** Fits app + DB + Redis at idle with ~2 GB headroom; 4 GB swap absorbs Next.js build spikes. |
| CAX21 (Arm, FSN1) | 4 / 8 GB / 80 GB | ~€7.59/mo | Upgrade target if on-box builds OOM or RAM contention surfaces in monitoring. |
| CPX22 (x86 AMD) | 3 / 4 GB / 80 GB | ~€7.99/mo | Same RAM as CAX11 but 2× the price and x86. Pick only if an Arm image is unavailable for some dependency. |
| CPX32 (x86 AMD) | 4 / 8 GB / 160 GB | ~€15/mo | Heavier upgrade target if disk also fills. |

FSN1 (Falkenstein) is the closest Hetzner region to Madrid; NBG1 (Nuremberg) and HEL1 (Helsinki) are alternatives within a few ms. Cloudflare's edge in Madrid fronts the user-facing latency regardless of origin location.

## Cost Estimate

| Item | Monthly | Notes |
| --- | --- | --- |
| Hetzner CAX11 (Arm, FSN1) | €3.79 | Post-April-2026 pricing. |
| Hetzner automated backups (+20%) | €0.76 | Daily snapshots, 7-day retention. |
| Domain `.com` (annualized via Porkbun) | ~€0.85 | ~€10.30/yr ÷ 12. Cloudflare Registrar is similar (~€9.60/yr). |
| Cloudflare DNS + proxy + SSL + DDoS | €0 | Free tier. |
| Backblaze B2 (pg_dump backups, ~5 GB) | <€0.05 | $6/TB, well under threshold. |
| Brevo transactional email | €0 | 300 emails/day free. |
| Sentry | unchanged | Already external; not part of this migration. |
| Self-hosted Redis | €0 | Replaces Upstash. |
| **Total** | **~€6/mo** | vs Railway ~$20–40/mo → ~70–85% savings. |

Predictability is part of the value: usage-spike surprises on Railway disappear.

## Migration Plan (Phased)

Each phase is independently verifiable. Don't proceed to the next until the current passes its checks.

### Phase 1 — Provision & harden

1. Create Hetzner project; deploy **CAX11** in **FSN1**, Ubuntu 24.04 LTS, with SSH key pre-installed.
2. Enable **Hetzner automated backups** on the server (+20%).
3. Create non-root sudo user; copy SSH key. Disable `PasswordAuthentication` and `PermitRootLogin` in `sshd_config`.
4. Install + enable `ufw` (allow 22/80/443 only) and `fail2ban` (default `sshd` jail).
5. Install `unattended-upgrades` for automatic security patches.
6. Create a **Hetzner Cloud Firewall** at the edge with the same 22/80/443 allowlist (belt-and-suspenders).
7. Add 4 GB swap (`fallocate /swapfile`, `mkswap`, `swapon`, `/etc/fstab` entry) to absorb Next.js build spikes on the 4 GB box.

**Verify**: SSH as non-root works, root SSH and password SSH refused, `ufw status` shows the rules, `fail2ban-client status sshd` is active.

### Phase 2 — Install Coolify

1. Run Coolify's one-line installer as the sudo user (`curl … coolify.io/install.sh | sudo bash`).
2. Set up a temporary subdomain on a domain you already control (or a Hetzner reverse DNS hostname) pointing at the VPS IP. Use this for Coolify's admin UI during cutover — **do not** expose the Coolify UI on the production domain.
3. Put the Coolify admin domain behind **Cloudflare Access** (free for 50 users) or HTTP basic auth at minimum.
4. Set the **GitHub webhook secret** in Coolify settings (long random string).

**Verify**: Coolify UI reachable only via the protected admin URL; HTTPS green; webhook secret saved.

### Phase 3 — Provision app services

1. In Coolify, create a **Postgres** resource. Record the generated `DATABASE_URL`.
2. Create a **Redis** resource. Record `REDIS_URL`.
3. Connect the GitHub repo. Configure the build:
   - Buildpack: Dockerfile (after the app-side PR lands) or Nixpacks fallback.
   - Branch: `main`.
   - Pre-deployment command: `pnpm prisma db push` (matches Railway behaviour).
   - Start command: `pnpm start` (or the Dockerfile `CMD`).
4. Add env vars: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BREVO_API_KEY`, `SENTRY_AUTH_TOKEN`, `SENTRY_DSN`, plus any other env vars currently set in Railway. Drop the `UPSTASH_*` pair.
5. Deploy on a **temporary subdomain** (e.g. `covenant-staging.<a-domain-you-own>`) — not yet the production domain.

**Verify**: app boots, `/api/health` returns 200, Google login round-trips, a forced error appears in Sentry, a test email arrives via Brevo, Better Auth session persists across replicas (Redis is doing its job).

### Phase 4 — Domain transfer

Domain currently lives with Railway's third-party registrar. Standard ICANN flow:

1. In the Railway-side registrar UI: disable WHOIS privacy if it blocks transfer email, **unlock** the domain, request the **EPP/auth code**.
2. At Porkbun (or Cloudflare Registrar): start an inbound transfer, paste the auth code, pay one year's renewal (rolls forward, no time lost).
3. Approve the transfer-confirmation email if one is sent.
4. **Caveat — ICANN 60-day lock**: a transfer is blocked if the domain was registered, last transferred, or had its registrant contact changed within 60 days. ICANN voted at ICANN 82 to retire this lock, but rollout is gradual — assume it still applies. If recently registered/changed, wait it out.
5. Transfer completes in **5–7 days**. The domain keeps resolving at the old registrar's DNS until you change nameservers — there is no DNS-level downtime during transfer itself.

### Phase 5 — DNS cutover

1. Once the transfer completes, point the domain's nameservers at Cloudflare (Cloudflare Registrar forces this anyway; Porkbun is configurable).
2. In Cloudflare DNS:
   - `A` record `@` → Hetzner VPS IP, proxied (orange cloud).
   - `CNAME www` → apex, proxied.
   - SSL/TLS mode: **Full (strict)**. Enable "Always Use HTTPS" and "Automatic HTTPS Rewrites".
3. In Coolify, change the app's domain from the temporary subdomain to the real one. Coolify will issue a fresh Let's Encrypt cert via Traefik.
4. Turn on Cloudflare **WAF managed rules** and **Bot Fight Mode**.
5. Smoke-test the production URL.

**Verify**: real domain resolves to Cloudflare → Hetzner; HTTPS green end-to-end; `/api/health` returns 200; login works; no mixed-content warnings.

### Phase 6 — Decommission Railway

1. Run the production app on Hetzner for **7 days** with daily backup + restore drill.
2. If clean, delete the Railway service, the Railway Postgres, and the Railway domain config.
3. Cancel any Upstash database that is no longer referenced.

## Backup & Recovery

- **Primary**: Coolify's S3 backup target → Backblaze B2 bucket, daily, 30-day retention.
- **Secondary**: `pg_dump | gzip | b2 upload` cron (e.g. via `restic` for encrypted incremental backups) at a different time of day. Two independent paths catch a single-point Coolify failure.
- **Monthly drill**: restore the latest backup into a throwaway Postgres on a separate Hetzner CX23 (€4/mo, spin up + destroy in an hour). If the restore fails or row counts diverge, that's the time to find out — not during an incident.
- **RPO**: 24 hours. **RTO**: ~1–2 hours to rebuild a fresh CAX11 from snapshot + Coolify reinstall + DB restore + Cloudflare A-record flip. Document the exact steps in `docs/runbooks/disaster_recovery.md` (separate PR).

## Security Hardening Checklist

- SSH keys only; root + password login disabled.
- `ufw` on the host **and** Hetzner Cloud Firewall at the edge — open only 22 / 80 / 443.
- `fail2ban` on SSH.
- `unattended-upgrades` enabled for the security pocket.
- Coolify admin UI behind Cloudflare Access (zero-trust), not on the public app domain.
- GitHub webhook signed with HMAC secret; Coolify validates.
- Postgres and Redis bound to `127.0.0.1` (or to the Docker bridge network) — never published to `0.0.0.0`.
- Cloudflare SSL mode **Full (strict)**, "Always Use HTTPS", HSTS preload (only after verifying everything serves over HTTPS).
- Cloudflare WAF managed rules + Bot Fight Mode on. Existing Better Auth + Upstash-replaced rate limiters keep the app-level fairness layer intact (see `docs/specs/ddos_protection.md`).
- Sensitive env vars (`JWT_SECRET`, `BREVO_API_KEY`, `GOOGLE_CLIENT_SECRET`) marked as secrets in Coolify, not plaintext env.

## Risks & Mitigations

| Risk | Mitigation |
| --- | --- |
| **Single point of failure** — app, DB, Redis on one VM. | Accepted (no users). Hetzner backups + B2 snapshots + documented runbook give an RTO of ~1–2h. Upgrade to two VPSes when there's anything to lose. |
| **RAM / disk contention during Next.js builds** on a 2-vCPU / 4-GB box. | 4 GB swap pre-allocated. If builds still OOM, move builds to GitHub Actions and push the image to Coolify's registry; the VPS only runs containers. Upgrading to CAX21 (8 GB) is the heavier alternative. |
| **Coolify CVEs** — fast-moving project, weekly patches. | Subscribe to the Coolify release feed; enable Coolify's auto-update for minor versions; keep host kernel current via `unattended-upgrades`. |
| **SSL renewal failure** silently breaking the site. | Cloudflare-side cert is auto-renewed by CF; origin cert is auto-renewed by Traefik via Coolify. Add a Better Stack (free) cert-expiry probe on the public URL plus a 5-minute HTTP uptime probe. |
| **Domain transfer downtime.** | Transfer itself does not affect DNS; cutover only happens when you change nameservers post-transfer. Pre-stage all CF DNS records before flipping nameservers. |
| **Prisma `db push` in prod has no migration history.** | Carried over from Railway; out of scope for this migration. Tracked as a follow-up to move to `prisma migrate deploy`. |
| **Cloudflare TOS 2.8** — non-HTML caching restriction. | We don't serve disproportionate media; covenant is HTML + API + small static assets. Compliant. |
| **ICANN 60-day transfer lock.** | If the domain was registered or contact-changed in the last 60 days, wait out the lock before Phase 4. |
| **Docker disk creep** filling 80 GB in weeks. | Weekly `docker system prune -af --volumes` cron. Monitor disk usage via Coolify Sentinel; alert at 70%. |

## Open Questions

These do not block the migration but should be resolved before/shortly after cutover:

- **Build location**: build on the VPS (simplest, risks OOM) or in GitHub Actions and push the image to GHCR or Coolify's registry (more robust, more moving parts)?
- **Staging environment**: add a second tiny VPS (CX22 ~€4/mo) for staging now, or rely on Coolify preview deploys on the same box?
- **Prisma workflow**: keep `db push` on cutover, then migrate to `prisma migrate deploy` as a separate change? Memory note already flags this project's `db push` preference — confirm it still applies in a self-hosted context.
- **Monitoring**: Coolify Sentinel is enough for now, or set up a separate Better Stack / Grafana Cloud free tier for log aggregation?

## Alternatives Considered

| Option | Why not (for this case) |
| --- | --- |
| **Stay on Railway** | Defeats both goals (cost + learning). |
| **Render / Fly.io / DigitalOcean App Platform** | Cheaper than Railway but still managed — minimal DevOps learning. |
| **Kamal 2** (Basecamp's deploy tool) | Deeper learning (no UI, just Docker + SSH + accessories). Known gotcha: Next.js needs `.env` baked into the image at build time, which conflicts with Kamal's runtime-only secrets ([basecamp/kamal#925](https://github.com/basecamp/kamal/issues/925)). Revisit after a year on Coolify if a tighter, code-defined deploy is wanted. |
| **Dokploy** | Lighter Coolify-alike (~350 MB idle vs ~1 GB), native Compose, smaller community. Reasonable pick if Coolify's RAM footprint hurts on a smaller plan. |
| **CapRover** | Mature but dated UI, weaker Compose support. Suited to multi-node Docker Swarm, which is overkill here. |
| **Plain Docker Compose + Caddy / Traefik** | Maximum learning, minimum convenience. Coolify gives essentially the same surface area with a UI; the underlying Docker / Traefik / Let's Encrypt is still inspectable. |

Coolify wins for the stated goal — broad DevOps surface (Docker, Traefik, LE, webhooks, Postgres ops, backups) with enough productive scaffolding that the migration completes in a weekend rather than a month.

## References

- [Hetzner Cloud pricing](https://www.hetzner.com/cloud/regular-performance)
- [Hetzner April 2026 price adjustment](https://www.hetzner.com/pressroom/statement-price-adjustment/)
- [Hetzner Cloud locations](https://docs.hetzner.com/cloud/general/locations/)
- [Coolify v4 release notes](https://github.com/coollabsio/coolify/releases)
- [Coolify Next.js docs](https://coolify.io/docs/applications/nextjs)
- [Cloudflare TOS section 2.8](https://www.cloudflare.com/website-terms/)
- [ICANN Transfer Policy](https://www.icann.org/en/contracted-parties/accredited-registrars/transfer-policy-01-06-2016-en)
- [Porkbun TLD pricing](https://porkbun.com/products/domains)
- [Cloudflare Registrar at-cost pricing](https://www.cloudflare.com/products/registrar/)
- [Kamal Next.js + secrets-at-build-time issue](https://github.com/basecamp/kamal/issues/925)
- [Dokploy / Coolify / CapRover comparison](https://docs.dokploy.com/docs/core/comparison)
- Existing internal spec: `docs/specs/ddos_protection.md` (Cloudflare-in-front rationale carries over).
