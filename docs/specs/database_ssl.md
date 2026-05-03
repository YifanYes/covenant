# Database SSL Configuration

## Overview

The app connects to Postgres via the `pg` connection pool in `src/server/lib/prisma.ts`. SSL is enabled in production and disabled in development/test.

```ts
ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
```

## Why rejectUnauthorized Must Be true

Setting `rejectUnauthorized: false` disables certificate verification entirely. Any server can present any certificate and the client will accept it, enabling man-in-the-middle attacks on the database connection. Credentials and query results travel over what appears to be an encrypted channel but can be intercepted.

`rejectUnauthorized: true` (the Node.js default) ensures:

- The server's certificate is signed by a trusted CA
- The certificate has not expired
- The hostname in the certificate matches the connection hostname

## Railway-Specific Notes

Railway's managed Postgres instances use certificates signed by a trusted CA. No extra CA bundle configuration is needed — Node.js's built-in CA store trusts Railway certificates out of the box. `rejectUnauthorized: true` works without additional setup.

Internal hostnames (`postgres.railway.internal`) are covered by Railway's certificate. Public hostnames are also covered. Either connection method is safe with strict verification enabled.

## Common Failure Scenarios

### UNABLE_TO_VERIFY_LEAF_SIGNATURE / SELF_SIGNED_CERT_IN_CHAIN

**Cause:** The database certificate is signed by a private CA not in Node.js's default trust store (common with some on-premise or misconfigured managed databases).

**Fix:** Add the CA certificate via the `ssl.ca` option:

```ts
ssl: {
  rejectUnauthorized: true,
  ca: fs.readFileSync('/path/to/ca.pem').toString(),
}
```

Or set via environment variable and pass it in:

```ts
ssl: {
  rejectUnauthorized: true,
  ca: env.DATABASE_SSL_CA, // PEM string stored in env var
}
```

### CERT_HAS_EXPIRED

**Cause:** The database's SSL certificate has passed its expiry date.

**Fix:** Renew the certificate on the database server. On Railway this is handled automatically. On self-hosted Postgres, use certbot or your certificate provider to renew.

### ERR_TLS_CERT_ALTNAME_INVALID / Hostname Mismatch

**Cause:** The hostname in `DATABASE_URL` does not match the CN or SAN in the certificate. Common when using an IP address instead of a hostname.

**Fix:** Use the hostname (e.g., `postgres.railway.internal` or the public Railway hostname) rather than a raw IP in `DATABASE_URL`.

### Connection Refused / ECONNREFUSED with SSL Enabled

**Cause:** The database server is not configured to accept SSL connections at all.

**Fix:** Enable SSL on the Postgres server (`ssl = on` in `postgresql.conf`). Railway Postgres has SSL enabled by default.

## Disabling SSL Locally

SSL remains disabled in `development` and `test` environments (the pool receives `ssl: false`). Local Postgres instances typically do not have SSL certificates configured, so no change is needed for local development.

## Verifying SSL Is Active

Connect with `psql` and run:

```sql
SELECT ssl, version FROM pg_stat_ssl WHERE pid = pg_backend_pid();
```

If `ssl` is `t`, the connection is encrypted.

Or check from Node.js by listening to the pool's `connect` event and inspecting `client.ssl`.
