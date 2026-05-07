# Switch auth from magic-link to email + password

## Context

Magic-link sign-in is fragile and untestable. Two real symptoms:

1. **Today**: magic-link emails are not arriving in the inbox at all (Brevo delivery dependency in the critical path of every login).
2. **A few weeks ago**: clicking the magic link landed on `/dashboard` with a 401. The cookie/redirect timing has produced repeated regressions over the past months.

The redirect-after-magic-link path in particular has too many moving parts: Brevo delivery → user clicks link in mail client → callback URL → cookie set → client-side redirect race with `useSession()`. Each link in that chain has produced a bug.

Email + password collapses all of that into one round-trip with no email dependency, and exposes a workflow that can be exercised by tests and by the developer in seconds during dev.

**Scope (confirmed with user):** remove magic-link entirely; keep Google OAuth; no migration (dev tables will be truncated manually); no email verification; remove the welcome email so Brevo is no longer in the critical path of any auth operation. With both magic-link and welcome emails gone, the `EmailService` / Brevo infrastructure has no remaining callers and is removed in this same change.

---

## Changes

### Backend

**`src/server/lib/auth.ts`** (rewrite the plugin block)
- Remove `import { magicLink } from 'better-auth/plugins'` and the entire `magicLink({...})` plugin entry.
- Remove imports that become unused after deleting both email sends: `renderMagicLinkEmail`/`renderWelcomeEmail` from `render-email`, `EmailService`, `createServerI18n`, `resolveEmailLocale`, `DEFAULT_LOCALE`. Keep `prisma` (still used by `prismaAdapter`) and `resolveCreateUserLocale` (still used by the `before` hook).
- Add `emailAndPassword: { enabled: true, autoSignIn: true, minPasswordLength: 8 }` to the `betterAuth({...})` config. (`autoSignIn: true` makes signup return a session immediately — no separate sign-in step. `minPasswordLength: 8` keeps Better Auth's server-side validation aligned with the Zod schema.)
- In `databaseHooks.user.create.after`: delete the welcome-email block entirely (everything inside the `try { ... }` that touches `prisma.user.findUnique`, `renderWelcomeEmail`, and `emailService.sendEmail`). Keep the `AUTH_SIGNUP` log line. The hook collapses to a single log call.
- Keep `databaseHooks.user.create.before` (sets locale) and `databaseHooks.session.create/delete` (login / session-deleted logging).
- In `hooks.after`, narrow the path filter: drop `'/magic-link'`, keep `'/sign-in'`, and add `'/sign-up'` so password signup failures still log via `AUTH_FAILURE`. Note: `includes` is intentional — covers `/sign-in/email`, `/sign-in/social`, `/sign-up/email`.
- Keep: Google `socialProviders`, `nextCookies()`, `session` config.

**`src/server/emails/render-email.tsx`** — delete (both render functions go away).

**`src/server/emails/magic-link.email.tsx`** — delete.

**`src/server/emails/welcome.email.tsx`** — delete.

**`src/server/services/email.service.ts`** — delete after verifying with `grep -r "EmailService\|email\.service" src` that no callers remain.

**`src/shared/schemas/auth.schemas.ts`**
- Replace `loginSchema` with the full object spelled out:
  ```ts
  export const loginSchema = z.object({
    email: z.email('errors.invalid_email'),
    password: z.string().min(8, 'errors.invalid_password_length')
  })
  ```
- Replace `signUpSchema` with name + password + confirmPassword and a `.refine` that pins the mismatch error to the `confirmPassword` field (without `path`, react-hook-form won't bind the error to the input):
  ```ts
  export const signUpSchema = z
    .object({
      name: z.string().min(1, 'errors.required_field'),
      email: z.email('errors.invalid_email'),
      password: z.string().min(8, 'errors.invalid_password_length'),
      confirmPassword: z.string().min(8, 'errors.invalid_password_length')
    })
    .refine((d) => d.password === d.confirmPassword, {
      message: 'errors.password_mismatch',
      path: ['confirmPassword']
    })
  ```
- Delete `verifyOTPSchema`, `refreshTokenSchema`, `updatePasswordSchema` — artifacts of an older auth design with no current callers (verify with `grep -r "verifyOTPSchema\|refreshTokenSchema\|updatePasswordSchema" src` before deleting; if any callers exist, leave them in place).

### Frontend

**`src/lib/auth.lib.ts`**
- Drop `magicLinkClient` import and plugin. The client becomes:
  ```ts
  export const authClient = createAuthClient()
  export const { signIn, signUp, signOut, useSession } = authClient
  ```

**`src/app/(auth)/login/page.tsx`** (large diff)
- Add a password `TextInput` (type=password) wired to `register('password')`.
- Update `useForm` `defaultValues` to `{ email: '', password: '' }` to avoid uncontrolled→controlled React warnings.
- Replace `authClient.signIn.magicLink({...})` with `authClient.signIn.email({...})`. Better Auth's React client returns `{ data, error }` rather than throwing on invalid credentials, so use the `result.error` pattern (avoids global `throw: true` config and keeps `result` typed):
  ```ts
  const result = await authClient.signIn.email({ email: data.email, password: data.password })
  if (result.error) {
    toast.error(t('login.error.title'), { description: t('login.error.invalid_credentials') })
    return
  }
  ```
  The existing `try/catch` becomes dead code for credential errors — either remove it entirely, or narrow it to catch only network/`TypeError` failures. The `setIsLoading(false)` in `finally` stays.
- Delete: `magicLinkSent` state and the `if (magicLinkSent) {...}` block. Delete the `isAccountVerified` derivation and its success alert — with `autoSignIn: true` no flow lands on `/login?type=signup` or `?verified=true`.
- **Keep `urlError`** plumbing — Google OAuth still redirects to `/login?error=...&error_description=...` on failure. Drop the `'Email link is invalid or has expired'` special-case translation; replace the alert title with `t('login.error.title')`. Improve the decode to `decodeURIComponent(errorDescription.replace(/\+/g, ' '))` (`decodeURIComponent` alone doesn't translate `+` → space, so do the plus-replace first).
- Check the `toast.success(t('login.success'))` call: if the current en/es value reads "Magic link sent!" it's misleading. Either update the i18n value or drop the toast (the auto-redirect already provides feedback).
- Keep: session-based auto-redirect, `verifying_messages` loader, Google OAuth button.

**`src/app/(auth)/sign-up/page.tsx`** (large diff)
- Add three `TextInput`s: `name` (text), `password` (type=password), `confirmPassword` (type=password).
- Update `useForm` with `defaultValues: { name: '', email: '', password: '', confirmPassword: '' }` to avoid uncontrolled→controlled React warnings.
- Replace `authClient.signIn.magicLink({...})` with `authClient.signUp.email({...})` using the same `{ data, error }` pattern as login. With `autoSignIn: true` the response sets the session cookie. Use a **hard navigation** for the redirect — the cookie was just set on the response and a hard nav guarantees the next request includes it without depending on `useSession()` cache invalidation. No `useRouter` import needed:
  ```ts
  const result = await authClient.signUp.email({
    email: data.email,
    password: data.password,
    name: data.name
  })
  if (result.error) {
    toast.error(t('sign_up.error.title'), { description: result.error.message ?? '' })
    return
  }
  window.location.assign(`/onboarding?locale=${locale}`)
  ```
- Delete the `isSigned` state and the entire "check your email" success card — it no longer applies.
- Keep Google OAuth button.

### i18n

**`public/locales/en/translation.json`** and **`public/locales/es/translation.json`** (parallel changes in both)
- Under `login`: delete `magic_link_sent_title`, `magic_link_sent_description`, `error.magic_link_error`, `error.invalid_magic_link`, `check_email_title`, `account_verified.title`, `account_verified.description`. Update or drop `login.success` (was magic-link-specific). (Keep `password` — already present.)
- Under `login.error`: add `title` (e.g., `"Error"`). This key is referenced by `toast.error(t('login.error.title'))` in the login and Google button components but is missing from the locale files. (`login.error.invalid_credentials` already exists in both locale files; reuse as-is.)
- Under `sign_up`: delete `success_title`, `success_message`. Add `name` ("Name" / "Nombre"). (Keep `password`, `confirm_password` — already present. `sign_up.error.title` already exists in both locale files; reuse as-is.)
- Under `errors`: update `invalid_password_length` to reference 8 characters instead of 6. Keep `password_mismatch` and `required_field` as-is.
- Delete the entire `emails` block (both `magicLink` and `welcome` sub-blocks) — no email rendering remains.

### Environment

- Remove `BREVO_API_KEY` from `.env.example` and from any `env` config schema — no remaining consumers after `EmailService` deletion.

### Tests

**`src/shared/__tests__/schemas/auth.schemas.test.ts`** (new — pure unit, no DB)
- `loginSchema` rejects invalid email, rejects password shorter than 8 chars, accepts valid input.
- `signUpSchema` rejects mismatched passwords with the `password_mismatch` error key attached to the `confirmPassword` path, rejects short passwords, rejects empty name, accepts a valid quartet.

**`src/server/__tests__/lib/auth.test.ts`** (new — optional, only if a test DB is trivial to stand up)
- Exercises the actual Better Auth instance via `auth.api.signUpEmail({ body: {...}, asResponse: false })` and `auth.api.signInEmail(...)` against a real `prisma` client connected to a `TEST_DATABASE_URL`.
- Do **not** attempt to mock the Prisma client for this test — Better Auth's adapter issues complex transaction and relation queries that are impractical to mock.
- If a test DB is not available, skip this file entirely. The schema unit tests are sufficient.

---

## Critical files

| File | Action |
|---|---|
| `src/server/lib/auth.ts` | Edit — swap `magicLink` plugin for `emailAndPassword`, remove welcome-email send |
| `src/lib/auth.lib.ts` | Edit — drop magic-link client plugin |
| `src/shared/schemas/auth.schemas.ts` | Edit — add password fields, drop dead schemas |
| `src/app/(auth)/login/page.tsx` | Edit — password field, `signIn.email`, drop magic-link UI |
| `src/app/(auth)/sign-up/page.tsx` | Edit — name + password fields, `signUp.email`, hard-nav redirect |
| `src/server/emails/render-email.tsx` | Delete |
| `src/server/emails/magic-link.email.tsx` | Delete |
| `src/server/emails/welcome.email.tsx` | Delete |
| `src/server/services/email.service.ts` | Delete (verify no remaining callers first) |
| `public/locales/{en,es}/translation.json` | Edit — drop magic-link/welcome/email keys, add `login.error.title`, add `sign_up.name` |
| `.env.example` | Edit — drop `BREVO_API_KEY` |
| `src/shared/__tests__/schemas/auth.schemas.test.ts` | Create |
| `src/server/__tests__/lib/auth.test.ts` | Create (optional — test DB only) |

---

## Verification

1. `pnpm tsc --noEmit` — clean.
2. `pnpm lint` — clean.
3. `pnpm test` — schema tests pass; existing suite still green (especially `session-token`, `prisma-session-extension`, `auth-locale`).
4. **DB reset** (manual, user does this):
   ```sql
   TRUNCATE "users", "accounts", "verifications", "sessions" CASCADE;
   ```
5. `pnpm dev` and exercise the flow in the browser:
   - `/sign-up` — submit name + email + password + confirm → redirected straight to `/onboarding`. **No email is sent at any point in the flow.**
   - Complete onboarding → land on `/dashboard` with no 401. *This is the regression that previously blocked us.*
   - `/login` → log out, log back in with same credentials → land on `/dashboard`.
   - Wrong password → toast surfaces an error, no session created.
   - `/login` with Google → still works (regression check).
6. Run after the `magic-link.email.tsx`, `welcome.email.tsx`, and `render-email.tsx` deletions: `grep -r "magicLink\|magic_link\|magic-link" src public` — should return zero hits.
7. `grep -r "account_verified\|magic_link_sent\|check_email_title" src public` — also zero hits (catches leftovers the magic-link grep won't).
8. `grep -r "EmailService\|BREVO_API_KEY\|renderWelcomeEmail" src .env.example` — zero hits (confirms email infrastructure is fully removed).

---

## Out of scope (defer)

- Password reset / "forgot password" flow.
- Email verification on signup.
- Rate limiting on sign-in attempts. **Note:** this is a mandatory fast-follow before any production traffic; without it the new email+password endpoints are trivially brute-forceable.
