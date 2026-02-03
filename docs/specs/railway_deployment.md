# Railway Deployment Guide

## 1. Deploy the Backend (API)

1. In your existing Railway project (with Postgres), click **"+ Create"** → **"GitHub Repo"**
2. Select the `arq` repository
3. Go to **Variables** tab and add `.env.prod` variables.
4. Go to **Settings → Networking** → **Public Networking** → Generate domain or add custom domain `api.arq-game.com`
5. Click **Deploy** (or redeploy if auto-deployed)

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

- **Package Manager**: The project uses pnpm. Railway will auto-detect from `pnpm-lock.yaml`
- **Node.js Version**: Requires Node.js 20+
- **Internal networking**: `postgres.railway.internal` only works within the same Railway project
- **Google OAuth**: Update redirect URIs in Google Cloud Console:
  - `https://api.arq-game.com/api/auth/callback/google`
- **Redeployment**: Push to main branch or use Railway dashboard to trigger manual deploy
- **Cleanup**: Remove any `RAILPACK_INSTALL_COMMAND` variable from Railway if previously added
