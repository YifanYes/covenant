# Database SSL Configuration

## Overview

The app connects to Postgres via the `pg` connection pool in `src/server/lib/prisma.ts`. TLS is enabled in production and disabled in development/test.

```ts
ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
```

The production channel is encrypted, but the certificate chain is **not** verified. This is a deliberate trade-off — see "Why rejectUnauthorized is false" below.

## Why rejectUnauthorized is false

Strict verification (`rejectUnauthorized: true`) does not work today against Railway's managed Postgres from a Prisma 7 client. Two compounding factors:

1. **Railway does not publish a CA bundle for managed Postgres.** Railway's TCP proxy and internal endpoints both present a certificate chain that is not anchored in Node.js's default trust store. There is no `ca` PEM we can pin via `ssl.ca`. Railway staff confirm in their forum that for project-private connectivity, the recommendation is to skip strict verification; for the public proxy they have not exposed a trust anchor.
2. **Open Prisma 7 regression.** `@prisma/adapter-pg` in the 7.x line stops trusting Railway-style chains that worked in Prisma 6.x, even with explicit pool options or `sslmode=verify-full`. Tracking issues:
   - [prisma/prisma#29060](https://github.com/prisma/prisma/issues/29060) — "Error opening a TLS connection: self-signed certificate in certificate chain"
   - [prisma/prisma#27611](https://github.com/prisma/prisma/issues/27611) — root duplicate, adapter-pg SSL handling
   - [prisma/prisma#29252](https://github.com/prisma/prisma/issues/29252) — `PrismaPg` connectionString fails on SSL-required DBs

What we keep:

- `ssl` is still an object (not `false`), so the connection still negotiates TLS — the wire is encrypted.
- The pool uses Railway's network endpoint, which runs on Railway's private project network, not the public internet.

What we lose:

- We do not validate that the certificate chain is rooted in a trusted CA. A MITM attacker on the network path could in theory present any certificate.

## Future Hardening (re-enable strict verification)

Flip back to `{ rejectUnauthorized: true }` once **either** condition holds:

1. **Prisma ships a fix** for #29060 / #27611 in the 7.x line that restores the 6.x behaviour — and we upgrade to that version.
2. **Railway exposes a CA bundle** for managed Postgres. Then add `DATABASE_SSL_CA` to `src/server/config.ts` and:
   ```ts
   ssl: env.NODE_ENV === 'production'
     ? { rejectUnauthorized: true, ca: env.DATABASE_SSL_CA }
     : false,
   ```

Tracked in `docs/specs/todo.md` under `[debt]`.

## Common Failure Scenarios

### UNABLE_TO_VERIFY_LEAF_SIGNATURE / SELF_SIGNED_CERT_IN_CHAIN

**Cause:** The database certificate is signed by a private CA not in Node.js's default trust store. With `rejectUnauthorized: false` this no longer fails the handshake; it would resurface immediately if strict verification is re-enabled prematurely.

**Fix when a CA is available:**

```ts
ssl: {
  rejectUnauthorized: true,
  ca: env.DATABASE_SSL_CA, // PEM string stored in env var
}
```

### CERT_HAS_EXPIRED

**Cause:** The database's SSL certificate has passed its expiry date.

**Fix:** Renew the certificate on the database server. On Railway this is handled automatically.

### ERR_TLS_CERT_ALTNAME_INVALID / Hostname Mismatch

**Cause:** The hostname in `DATABASE_URL` does not match the CN or SAN in the certificate. Common when using an IP address instead of a hostname.

**Fix:** Use the hostname (e.g., `postgres.railway.internal` or the public Railway hostname) rather than a raw IP in `DATABASE_URL`.

### Connection Refused / ECONNREFUSED with SSL Enabled

**Cause:** The database server is not configured to accept SSL connections at all.

**Fix:** Enable SSL on the Postgres server (`ssl = on` in `postgresql.conf`). Railway Postgres has SSL enabled by default.

## Disabling SSL Locally

SSL remains disabled in `development` and `test` environments (the pool receives `ssl: false`). Local Postgres instances typically do not have SSL certificates configured, so no change is needed for local development.

## Verifying the Connection Is Encrypted

Even with `rejectUnauthorized: false`, the channel is still TLS-encrypted. Confirm with:

```sql
SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid();
```

If `ssl` is `t`, the connection is encrypted. The lost guarantee is *whose certificate* terminated the TLS, not whether TLS is present.
