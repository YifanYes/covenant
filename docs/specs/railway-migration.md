# Railway PostgreSQL Migration Specification

## Overview

This document outlines the technical specification for migrating the ARQ server from Supabase to Railway's managed PostgreSQL instance. The migration involves two major components:

1. **Database Migration**: Moving PostgreSQL data and connection from Supabase to Railway
2. **Authentication Replacement**: Replacing Supabase Auth with Better Auth

## Current Architecture

### Technology Stack

- **Runtime**: Bun
- **Framework**: Fastify v5.6.2
- **API**: tRPC
- **ORM**: Prisma 7.2.0 with `@prisma/adapter-pg`
- **Database**: PostgreSQL (currently hosted on Supabase)
- **Connection**: node-postgres Pool with SSL

### Current Supabase Usage

#### Authentication (Primary Use)
- OAuth with Google provider (`signInWithOAuth`)
- Magic Link authentication via OTP (`signInWithOtp`)
- Token verification (`getUser`)
- Admin operations (`admin.deleteUser`)
- Configuration: PKCE flow, no auto-refresh, stateless

**Key File**: `server/lib/supabase.ts`
```typescript
const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_KEY, {
  auth: {
    flowType: 'pkce',
    autoRefreshToken: false,
    detectSessionInUrl: false,
    persistSession: false
  }
})
```

#### Database
- PostgreSQL accessed via Prisma (NOT using Supabase client for DB operations)
- Two connection strings: `DATABASE_URL` (pooled) and `DIRECT_URL` (migrations)
- SSL enabled with PrismaPg adapter and node-postgres Pool
- 12 database models: Character, CharacterClass, Objective, Area, Task, Habit, HabitCompletion, MapActivity, ActivityParticipation, CombatEnemy, Investment, InvestmentContribution

### Critical Files

| File | Purpose |
|------|---------|
| `server/lib/supabase.ts` | Supabase client initialization |
| `server/services/auth.service.ts` | Auth logic (signUp, login, OAuth, deleteAccount) |
| `server/lib/prisma.ts` | Database connection setup |
| `server/context.ts` | Request context with user token verification |
| `server/config.ts` | Environment variable validation |
| `server/prisma/schema.prisma` | Database schema |

## Migration Solution: Better Auth

### Why Better Auth?

We recommend **Better Auth** (https://better-auth.com) as the replacement for Supabase Auth:

1. **Modern & Type-Safe**: Built with TypeScript, full type inference
2. **Framework Agnostic**: Works with both Fastify (backend) and Next.js (frontend)
3. **Built-in Features**:
   - Magic Link authentication
   - OAuth (Google, GitHub, etc.)
   - Session management
   - Database adapters (supports Prisma)
4. **Lightweight**: No vendor lock-in, runs on your infrastructure
5. **Flexible Email Provider**: Works with any SMTP provider

### Email Provider: Resend

For magic link delivery, we recommend **Resend**:
- Modern, developer-friendly API
- Generous free tier (3,000 emails/month)
- Excellent deliverability
- Simple integration

**Alternatives**: SendGrid, AWS SES, Postmark

## Database Schema Changes

### New Better Auth Tables

Add the following models to `server/prisma/schema.prisma`:

```prisma
// Better Auth tables
model User {
  id            String    @id @default(uuid()) @db.Uuid
  email         String    @unique
  emailVerified Boolean   @default(false)
  name          String?
  image         String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts      Account[]
  sessions      Session[]

  @@map("users")
}

model Account {
  id                String   @id @default(uuid()) @db.Uuid
  userId            String   @db.Uuid
  accountId         String
  providerId        String
  accessToken       String?
  refreshToken      String?
  idToken           String?
  expiresAt         DateTime?
  password          String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([providerId, accountId])
  @@map("accounts")
}

model Session {
  id        String   @id @default(uuid()) @db.Uuid
  userId    String   @db.Uuid
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model VerificationToken {
  id         String   @id @default(uuid()) @db.Uuid
  identifier String
  value      String
  expiresAt  DateTime
  createdAt  DateTime @default(now())

  @@unique([identifier, value])
  @@map("verification_tokens")
}
```

### Update Character Model

Link Character to new User model:

```prisma
model Character {
  // ... existing fields
  userId String @unique @db.Uuid
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  // ... rest of fields
}
```

## Environment Variables

### Server (.env)

**Remove:**
```bash
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
```

**Add:**
```bash
# Database (Railway)
DATABASE_URL=postgresql://user:pass@host:5432/db?pgbouncer=true
DIRECT_URL=postgresql://user:pass@host:5432/db

# Application URLs
APP_URL=https://api.yourdomain.com
FRONT_URL=https://yourdomain.com

# Authentication
JWT_SECRET=<64-char-random-string>

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxxx
FROM_EMAIL=noreply@yourdomain.com

# OAuth
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
```

### Frontend (.env.local)

**Keep:**
```bash
NEXT_PUBLIC_API_URL=http://localhost:3000
```

**Remove:**
```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Backend Implementation

### 1. Dependencies

**Add to server/package.json:**
```json
{
  "dependencies": {
    "better-auth": "^1.0.0",
    "@better-auth/prisma": "^1.0.0",
    "resend": "^3.0.0"
  }
}
```

**Remove:**
```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.88.0"
  }
}
```

### 2. Create Better Auth Instance

**Create server/lib/auth.ts:**
```typescript
import { betterAuth } from 'better-auth'
import { prismaAdapter } from '@better-auth/prisma'
import { prisma } from './prisma'
import { env } from '../config'
import { Resend } from 'resend'

const resend = new Resend(env.RESEND_API_KEY)

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: 'postgresql'
  }),

  socialProviders: {
    google: {
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      redirectURI: `${env.APP_URL}/api/auth/callback/google`,
    },
  },

  magicLink: {
    enabled: true,
    sendMagicLink: async ({ email, url, token }) => {
      await resend.emails.send({
        from: env.FROM_EMAIL,
        to: email,
        subject: 'Your magic link to sign in',
        html: `
          <p>Click the link below to sign in:</p>
          <a href="${url}">Sign in to ARQ</a>
          <p>This link will expire in 10 minutes.</p>
        `
      })
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update every 24 hours
  },
})

export type Auth = typeof auth
```

### 3. Update Context

**Update server/context.ts:**
```typescript
import type { FastifyRequest } from 'fastify'
import { prisma } from './lib/prisma'
import { auth } from './lib/auth'
import { ServiceFactory } from './services/service.factory'

export async function createContext({ req }: { req: FastifyRequest }) {
  const authHeader = req.headers.authorization
  const token = authHeader?.split(' ')[1]

  let user = null
  if (token) {
    const session = await auth.api.getSession({
      headers: req.headers as any
    })

    if (session) {
      user = session.user
    }
  }

  const services = new ServiceFactory(prisma)

  return { user, prisma, services }
}

export type Context = Awaited<ReturnType<typeof createContext>>
```

### 4. Update Auth Service

**Update server/services/auth.service.ts:**
```typescript
import { auth } from '../lib/auth'
import { env } from '../config'

export class AuthService {
  constructor(private prisma: PrismaClient) {
    // Remove supabase parameter
  }

  async signUp(input: SignUpType) {
    await auth.api.sendMagicLink({
      body: {
        email: input.email,
        callbackURL: `${env.FRONT_URL}/onboarding`,
      }
    })
    return { message: 'Magic link sent to your email' }
  }

  async login(input: LoginType) {
    await auth.api.sendMagicLink({
      body: {
        email: input.email,
        callbackURL: `${env.FRONT_URL}/login`,
      }
    })
    return { message: 'Magic link sent to your email' }
  }

  async loginWithGoogle() {
    const url = `${env.APP_URL}/api/auth/signin/google`
    return { url }
  }

  async deleteAccount(userId: string) {
    await this.prisma.$transaction(async (tx) => {
      // Delete all user data
      await this.characterRepository.deleteManyByUserId(userId)
      // ... other deletions

      // Delete auth data (cascades to sessions and accounts)
      await tx.user.delete({ where: { id: userId } })
    })
    return { message: 'Account deleted successfully' }
  }
}
```

### 5. Add Better Auth API Routes

**Create server/routers/better-auth.router.ts:**
```typescript
import { toWebHandler } from 'better-auth/adapters/node'
import type { FastifyRequest, FastifyReply } from 'fastify'
import { auth } from '../lib/auth'

export async function registerBetterAuthRoutes(app: any) {
  const handler = toWebHandler(auth)

  app.all('/api/auth/*', async (request: FastifyRequest, reply: FastifyReply) => {
    const response = await handler(request.raw)

    response.headers.forEach((value, key) => {
      reply.header(key, value)
    })

    reply.status(response.status)

    if (response.body) {
      const body = await response.text()
      reply.send(body)
    } else {
      reply.send()
    }
  })
}
```

**Update server/server.ts:**
```typescript
import { registerBetterAuthRoutes } from './routers/better-auth.router'

async function startServer() {
  // ... existing setup

  // Register Better Auth routes BEFORE tRPC
  await registerBetterAuthRoutes(server)

  await server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  })

  // ... rest of setup
}
```

### 6. Update Service Factory

**Update server/services/service.factory.ts:**
```typescript
export class ServiceFactory {
  constructor(private prisma: PrismaClient) {
    // Remove supabase parameter
  }

  get auth(): AuthService {
    if (!this._authService) {
      this._authService = new AuthService(this.prisma) // Remove supabase
    }
    return this._authService
  }
}
```

### 7. Update Config

**Update server/config.ts:**
```typescript
const envSchema = z.object({
  NODE_ENV: z.enum(['dev', 'prod', 'test']).default('dev'),
  PORT: z.string().transform((val) => parseInt(val, 10)),
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),

  // Replace Supabase with Better Auth
  JWT_SECRET: z.string().min(32),
  APP_URL: z.url(),
  FRONT_URL: z.url(),

  // Email
  RESEND_API_KEY: z.string().min(1),
  FROM_EMAIL: z.string().email(),

  // OAuth
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
})
```

### 8. Delete Supabase Client

**Remove:** `server/lib/supabase.ts`

## Frontend Implementation

### 1. Dependencies

**Add to front/package.json:**
```json
{
  "dependencies": {
    "better-auth": "^1.0.0"
  }
}
```

**Remove:**
```json
{
  "dependencies": {
    "@supabase/ssr": "^0.8.0",
    "@supabase/supabase-js": "^2.91.1"
  }
}
```

### 2. Create Better Auth Client

**Create front/lib/auth.lib.ts:**
```typescript
import { createAuthClient } from 'better-auth/react'
import { env } from './config.lib'

export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_API_URL
})

export const {
  signIn,
  signOut,
  useSession,
  magicLink
} = authClient
```

### 3. Update tRPC Client

**Update front/utils/trpc.utils.ts:**
```typescript
import { authClient } from '@/lib/auth.lib'

const trpcLink = httpBatchLink({
  url: `${env.NEXT_PUBLIC_API_URL}/trpc`,
  async headers() {
    const session = await authClient.getSession()
    const token = session?.session?.token

    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    }
  },
})
```

### 4. Update Auth Store

**Update front/stores/auth.store.ts:**
```typescript
import { signOut } from '@/lib/auth.lib'

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      // ... existing state
      signOut: async () => {
        await signOut()
        set({ email: '', userId: '' })
      }
    }),
    { name: 'arq-store' }
  )
)
```

### 5. Update Middleware

**Update front/middleware.ts:**
```typescript
import { authClient } from './lib/auth.lib'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const session = await authClient.getSession({
    fetchOptions: {
      headers: {
        cookie: request.headers.get('cookie') || ''
      }
    }
  })

  const isAuthRoute = pathname.startsWith('/login') ||
                      pathname.startsWith('/sign-up') ||
                      pathname.startsWith('/auth/callback')

  const isProtectedRoute = !isAuthRoute && pathname !== '/'

  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect_to', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}
```

### 6. Update Login Page

**Update front/app/(auth)/login/page.tsx:**
```typescript
import { magicLink, useSession } from '@/lib/auth.lib'

export default function Login() {
  const { data: session, isPending } = useSession()

  const onSubmit = useCallback(async (data: LoginType) => {
    await magicLink.signIn({
      email: data.email,
      callbackURL: `${window.location.origin}/login`
    })
    setMagicLinkSent(true)
  }, [])

  // ... rest of component
}
```

### 7. Update Google Login Button

**Update front/app/(auth)/_components/google-login-button.component.tsx:**
```typescript
import { signIn } from '@/lib/auth.lib'

export default function GoogleLoginButton() {
  const handleGoogleLogin = async () => {
    await signIn.social({
      provider: 'google',
      callbackURL: `${window.location.origin}/login`
    })
  }

  return <LoaderButton onClick={handleGoogleLogin} />
}
```

### 8. Delete Supabase Client

**Remove:** `front/lib/supabase.lib.ts`

## Migration Steps

### Phase 1: Pre-Migration Preparation

1. **Railway Setup**
   - [ ] Create Railway PostgreSQL instance
   - [ ] Obtain connection strings (pooled and direct)
   - [ ] Configure SSL certificates if needed

2. **Email Service Setup**
   - [ ] Create Resend account
   - [ ] Obtain API key
   - [ ] Configure domain and DNS (SPF, DKIM)
   - [ ] Test email delivery

3. **OAuth Configuration**
   - [ ] Update Google OAuth callback URLs in Google Cloud Console
   - [ ] New callback URL: `https://api.yourdomain.com/api/auth/callback/google`

4. **Backup Current Database**
   ```bash
   pg_dump -h <supabase-host> -U <user> -d <database> -F c -b -v -f backup.dump
   ```

### Phase 2: Database Migration

1. **Update Schema**
   ```bash
   # From server directory
   bun run prisma migrate dev --name add_better_auth_tables
   ```

2. **Migrate User Data**
   ```bash
   # Run user migration script
   bun run scripts/migrate-users.ts
   ```

3. **Migrate Application Data**
   ```bash
   # Export from Supabase
   pg_dump -h <supabase-host> -U <user> -d <database> --data-only \
     --table=characters --table=character_classes --table=objectives \
     --table=areas --table=tasks --table=habits --table=habit_completions \
     --table=map_activities --table=activity_participations \
     --table=combat_enemies --table=investments \
     --table=investment_contributions -f data.sql

   # Import to Railway
   psql -h <railway-host> -U <user> -d <database> -f data.sql
   ```

4. **Verify Data Integrity**
   - [ ] Check row counts match
   - [ ] Verify foreign key relationships
   - [ ] Test sample queries

### Phase 3: Code Deployment

1. **Backend Deployment**
   - [ ] Install new dependencies
   - [ ] Update environment variables
   - [ ] Deploy new code
   - [ ] Verify health checks

2. **Frontend Deployment**
   - [ ] Install new dependencies
   - [ ] Update environment variables
   - [ ] Deploy new code
   - [ ] Clear CDN caches

### Phase 4: Verification

1. **Test Authentication Flows**
   - [ ] Magic link login
   - [ ] Google OAuth login
   - [ ] Token verification
   - [ ] Session persistence
   - [ ] Logout

2. **Test Protected Routes**
   - [ ] Middleware redirects
   - [ ] tRPC authentication
   - [ ] User data access

3. **Test User Management**
   - [ ] New account creation
   - [ ] Account deletion
   - [ ] Data cleanup on delete

### Phase 5: Monitoring

**First 48 Hours:**
- [ ] Watch error rates
- [ ] Monitor database performance
- [ ] Track email deliverability
- [ ] Check user login success rates

**After 1 Week:**
- [ ] Remove Supabase dependencies completely
- [ ] Delete unused environment variables
- [ ] Archive migration scripts
- [ ] Update documentation

## Migration Script: User Data

Create `server/scripts/migrate-users.ts`:

```typescript
import { PrismaClient } from '../generated/prisma'
import { createClient } from '@supabase/supabase-js'

const prisma = new PrismaClient()
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
)

async function migrateUsers() {
  const { data: supabaseUsers, error } = await supabase.auth.admin.listUsers()

  if (error) throw error

  for (const supaUser of supabaseUsers.users) {
    await prisma.user.upsert({
      where: { id: supaUser.id },
      update: {},
      create: {
        id: supaUser.id,
        email: supaUser.email!,
        emailVerified: supaUser.email_confirmed_at !== null,
        name: supaUser.user_metadata?.name,
        image: supaUser.user_metadata?.avatar_url,
        createdAt: new Date(supaUser.created_at),
        updatedAt: new Date(supaUser.updated_at || supaUser.created_at),
      }
    })

    if (supaUser.identities?.length) {
      for (const identity of supaUser.identities) {
        await prisma.account.upsert({
          where: {
            providerId_accountId: {
              providerId: identity.provider,
              accountId: identity.id,
            }
          },
          update: {},
          create: {
            userId: supaUser.id,
            accountId: identity.id,
            providerId: identity.provider,
            createdAt: new Date(identity.created_at),
            updatedAt: new Date(identity.updated_at || identity.created_at),
          }
        })
      }
    }
  }

  console.log(`Migrated ${supabaseUsers.users.length} users`)
}

migrateUsers()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## Risk Assessment

### High Risk

| Risk | Mitigation |
|------|------------|
| User session invalidation (all users logged out) | Communicate clearly, schedule during low-traffic time |
| Data loss during migration | Multiple backups, test on staging, verify integrity |
| Email deliverability (magic links go to spam) | Warm up domain, use Resend, configure SPF/DKIM |

### Medium Risk

| Risk | Mitigation |
|------|------------|
| OAuth callback URL changes | Update Google Cloud Console before deployment |
| Railway performance unknown | Load test before migration, monitor closely after |

### Low Risk

| Risk | Mitigation |
|------|------------|
| Railway SSL configuration differences | Test connection strings thoroughly |
| Email template styling | Test emails before launch |

## Rollback Plan

If critical issues arise:

1. **Immediate Actions**
   - Revert environment variables to Supabase
   - Redeploy previous version
   - Restore database from backup if needed

2. **Gradual Migration**
   - Keep both systems running during transition
   - Gradually migrate users
   - Monitor for issues

## Success Criteria

- [ ] All users can log in with magic links
- [ ] All users can log in with Google OAuth
- [ ] All existing data is accessible
- [ ] No data loss or corruption
- [ ] Protected routes work correctly
- [ ] Email delivery success rate > 95%
- [ ] Database performance comparable to Supabase
- [ ] Zero critical errors in first 24 hours

## Files to Modify

### Backend

- `server/package.json` - Update dependencies
- `server/config.ts` - Update environment schema
- `server/lib/auth.ts` - Create Better Auth instance
- `server/lib/prisma.ts` - Update connection (if needed)
- `server/context.ts` - Update session verification
- `server/services/auth.service.ts` - Update auth methods
- `server/services/service.factory.ts` - Remove Supabase param
- `server/routers/better-auth.router.ts` - Create auth routes
- `server/server.ts` - Register auth routes
- `server/trpc.ts` - Remove Supabase from context
- `server/prisma/schema.prisma` - Add Better Auth tables
- `.env.example` - Update example variables

### Frontend

- `front/package.json` - Update dependencies
- `front/lib/auth.lib.ts` - Create Better Auth client
- `front/lib/config.lib.ts` - Update environment schema
- `front/stores/auth.store.ts` - Update signOut
- `front/utils/trpc.utils.ts` - Update auth headers
- `front/middleware.ts` - Update session check
- `front/app/(auth)/login/page.tsx` - Update login logic
- `front/app/(auth)/sign-up/page.tsx` - Update signup logic
- `front/app/(auth)/_components/google-login-button.component.tsx` - Update OAuth
- `front/app/auth/callback/route.ts` - Simplify callback
- `.env.local.example` - Update example variables

### Files to Delete

- `server/lib/supabase.ts`
- `front/lib/supabase.lib.ts`

## Timeline Estimate

| Phase | Duration |
|-------|----------|
| Preparation (Railway, Resend, OAuth setup) | 3-5 days |
| Backend implementation | 3 days |
| Frontend implementation | 2 days |
| Integration testing | 2 days |
| Migration execution | 1 day (2-4 hours downtime) |
| **Total** | **9-13 days** |

## Implementation Notes

- All users will be logged out during migration (expected behavior)
- Existing sessions won't work with new system
- Magic link emails should be tested thoroughly before launch
- Monitor database connection pool settings in Railway
- Better Auth handles OAuth callbacks automatically via API routes
- Railway provides both pooled (for app) and direct (for migrations) connection URLs
