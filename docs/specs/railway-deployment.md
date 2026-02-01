# Railway Deployment Guide

## 1. Deploy the Backend (API)

1. In your existing Railway project (with Postgres), click **"+ Create"** → **"GitHub Repo"**
2. Select the `arq` repository
3. Once created, go to **Settings → Source** and click **"Add Root Directory"**, set to `server`
4. Go to **Variables** tab and add:

```
NODE_ENV=prod
PORT=2022
DATABASE_URL=postgresql://postgres:kSyrINWlZzeoIVdJkojArSsUUZHIFxBp@postgres.railway.internal:5432/railway
DIRECT_URL=postgresql://postgres:kSyrINWlZzeoIVdJkojArSsUUZHIFxBp@postgres.railway.internal:5432/railway
FRONT_URL=https://arq-game.com
APP_URL=https://api.arq-game.com
RESEND_API_KEY=re_6mZYesEK_9TXPYSXxVJhMHSCW1PBsPGyK
FROM_EMAIL=yifanyemontpe@gmail.com
JWT_SECRET=zGvs7AbSxMbEGp6dbqYg3nPBPEriA1WymcwBvq6bVIBM2LJxKmPE7HRy39YDJ1ve
GOOGLE_CLIENT_ID=523766600530-l23qto9k34m4004na487mifmt6uvi62m.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

5. Go to **Settings → Networking** → **Public Networking** → Generate domain or add custom domain `api.arq-game.com`
6. Click **Deploy** (or redeploy if auto-deployed)

## 2. Deploy the Frontend

1. In the same project, click **"+ Create"** → **"GitHub Repo"**
2. Select the same `arq` repository again
3. Go to **Settings → Source** and click **"Add Root Directory"**, set to `front`
4. Go to **Variables** tab and add:

```
NEXT_PUBLIC_API_URL=https://api.arq-game.com
```

5. Go to **Settings → Networking** and add custom domain `arq-game.com`
6. Click **Deploy**

## 3. Link Custom Domains

In your domain registrar, add CNAME records:
- `api` → Railway's backend domain (e.g., `arq-server-production.up.railway.app`)
- `@` or `www` → Railway's frontend domain (e.g., `arq-front-production.up.railway.app`)

## Important Notes

- **Internal networking**: `postgres.railway.internal` only works within the same Railway project
- **Google OAuth**: Update redirect URIs in Google Cloud Console:
  - `https://api.arq-game.com/api/auth/callback/google`
- **Redeployment**: Push to main branch or use Railway dashboard to trigger manual deploy
