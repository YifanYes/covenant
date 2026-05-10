# Frontend Architecture

> **Last Updated**: 2026-05-10

## Stack

| Layer | Tech | Version |
|---|---|---|
| **Framework** | Next.js App Router | 16.2.6 |
| **Language** | TypeScript (strict) | 5.9.3 |
| **UI Library** | React | 19.2.3 |
| **Styling** | Tailwind CSS v4 | 4.x |
| **UI Primitives** | Radix UI | 13 packages |
| **Server State** | React Query | 5.90.20 |
| **Client State** | Zustand | 5.0.10 |
| **Forms** | react-hook-form + Zod | 7.71.1 / 4.3.6 |
| **Routing** | Next.js App Router | built-in |
| **API Client** | tRPC | 11.8.1 |
| **i18n** | i18next | 25.8.0 |
| **Animations** | Framer Motion | 12.34.3 |
| **Charts** | Recharts | 3.7.0 |
| **Date** | dayjs | 1.11.19 |
| **Error Tracking** | Sentry | 10.52.0 |

## Route Structure (App Router)

```
src/app/
├── (auth)/             # Public auth pages
│   ├── sign-up/
│   ├── login/
│   ├── forgot-password/
│   ├── reset-password/
│   ├── onboarding/
│   └── _components/   # Page-local components
├── (workspace)/        # Protected app pages
│   ├── dashboard/
│   ├── calendar/
│   ├── tasks/
│   ├── habits/
│   ├── objectives/
│   ├── quests/
│   ├── inventory/
│   ├── map/            # Combat view
│   ├── journaling/
│   ├── shop/
│   ├── settings/
│   ├── productivity-layout.tsx
│   ├── rpg-layout.tsx
│   └── layout.tsx      # Shared nav + auth guard
├── (landing)/          # Marketing pages (SSG, SEO)
├── (card)/             # Public card pages [slug]
├── api/
│   ├── auth/[...all]/  # Better Auth handler
│   ├── trpc/[...trpc]/ # tRPC endpoint
│   ├── health/
│   └── logs/
└── providers/
    ├── trpc-provider.tsx
    └── i18n-provider.tsx
```

Auth guarding: enforced via `protectedProcedure` in tRPC context — no `middleware.ts` file.

## Component Organization

```
src/components/
├── ui/             # Radix + custom base components (29 files)
├── common/         # App-wide wrappers (theme, Sentry, layout)
├── forms/          # Form-specific components
├── auth/           # Auth flow components
├── combat/         # Combat UI (dice, enemies, log) — 12 files
├── tasks/          # Task display components
├── calendars/      # Calendar views
├── tutorial/       # Tutorial overlay
├── skeletons/      # Loading states
└── suspense-fallbacks/
```

Page-local components live in `src/app/(workspace)/<page>/_components/`.

### Naming Conventions

| Thing | Pattern | Example |
|---|---|---|
| File | `domain-name.component.tsx` | `enemy-card.component.tsx` |
| Hook | `use-name.hook.ts` | `use-combat.hook.ts` |
| Store | `name.store.ts` | `tutorial.store.ts` |
| Schema | `name.schemas.ts` | `character.schemas.ts` |
| Util | `name.utils.ts` | `query-invalidation.utils.ts` |

Exports: named exports (`export function ComponentName()`).

## Client State (Zustand)

5 stores in `src/stores/`:

| Store | Persisted | Purpose |
|---|---|---|
| `auth.store.ts` | Yes (`covenant-store`) | email, userId, signOut |
| `user-preferences.store.ts` | Yes | theme, locale |
| `calendar.store.ts` | No | selected month/date |
| `tasks.store.ts` | No | view filters/sorts |
| `tutorial.store.ts` | No | tutorial step/state |

## API Integration

tRPC v11 + React Query v5. Type-safe end-to-end from Zod schemas through tRPC to React component.

```
src/utils/trpc.utils.ts    # createTRPCReact + httpBatchLink
src/app/providers/trpc-provider.tsx  # QueryClient + TRPCProvider
```

## Path Aliases

```json
{
  "@/*": ["./src/*"],
  "@/components/*": ["./src/components/*"],
  "@/ui/*": ["./src/components/ui/*"],
  "@/stores/*": ["./src/stores/*"],
  "@/lib/*": ["./src/lib/*"],
  "@/hooks/*": ["./src/hooks/*"],
  "@/utils/*": ["./src/utils/*"],
  "@/types/*": ["./src/types/*"],
  "@/server/*": ["./src/server/*"],
  "@shared/*": ["./src/shared/*"]
}
```

Deep imports preferred over barrel files — better tree-shaking, clearer ownership.

## Styling

- Tailwind v4 (CSS-first config, Oxide engine)
- Class-based dark mode
- Faction theme system via CSS classes (`use-faction-theme.ts`)
- `clsx` utility at `@/lib/cn.lib.ts`
- No CSS-in-JS

## Shared Isomorphic Code

`src/shared/` contains code used by both client and server:

```
shared/
├── schemas/     # Zod validation schemas (input/output)
├── constants/   # Game constants (classes, enemies, quests, items, factions)
└── types/       # TypeScript types (character, combat, doctrine, etc.)
```

## SSR / SEO

Next.js App Router gives per-route rendering control:
- `(landing)/` — SSG, fully crawlable
- `(workspace)/` — mostly CSR (game state), auth-gated
- `(card)/[slug]` — SSR, public info pages

Landing page SEO problem that motivated infrastructure redesign is **solved** — no separate Astro project needed.

## What We Are NOT Doing

- No separate React SPA (Vite) — Next.js handles all frontend
- No Astro landing site — landing is part of the Next.js app
- No Redux / Context API for state — Zustand only
- No styled-components / emotion — Tailwind only
- No barrel `index.ts` files — deep imports only
- No `middleware.ts` for auth — tRPC `protectedProcedure` handles it
