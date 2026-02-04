# Security Audit Report - ARQ Project

## Executive Summary

A comprehensive security audit of the ARQ codebase identified several vulnerabilities across authentication, authorization, and general security practices. The most critical issues require immediate attention.

---

## Critical Issues (Immediate Action Required)

### 1. Missing Authorization in Repository Methods

**Locations:**
- `server/repositories/area.repository.ts` (lines 56-71)
- `server/repositories/objective.repository.ts` (lines 44-70)

**Issue:** The `update()` and `delete()` methods do NOT verify user ownership at the repository level. While service layer calls `findByIdOrThrow(id, userId)` first, the repository methods themselves are not defensive.

```typescript
// area.repository.ts - NO userId check
async update(id: string, input: UpdateAreaBodyType): Promise<Area> {
  return this.prisma.area.update({ where: { id }, data: { ... } })
}
```

**Risk:** Horizontal privilege escalation - users could modify/delete other users' data if repository methods are called directly.

**Fix:** Add userId parameter and ownership verification to update/delete methods.

---

### 2. Character Ownership Not Validated in Routers

**Locations:**
- `server/routers/investment.router.ts` - contribute endpoint
- `server/routers/activity.router.ts` (line 35-39) - join endpoint

**Issue:** These endpoints accept `characterId` from user input without verifying the authenticated user owns that character.

```typescript
// investment.router.ts
contribute: protectedProcedure.input(contributeSchema).mutation(async ({ ctx, input }) => {
  // input.characterId not verified to belong to ctx.user.id
  return ctx.services.investment.contribute(input.investmentId, input.characterId, input.amount)
})
```

**Risk:** User could perform actions using another user's character.

**Fix:** Add ownership verification before calling service methods.

---

### 3. Character Data Accessible Without Ownership Check

**Location:** `server/services/character.service.ts` (lines 26-28)

**Issue:** `getCharacterById()` returns any character by ID without verifying ownership.

**Risk:** Data exposure - users can query any character's data.

**Fix:** Add optional userId parameter for ownership verification.

---

## High Severity Issues

### 4. No Rate Limiting

**Issue:** No rate limiting middleware found in dependencies or implementation.

**Risk:** Brute force attacks on authentication, API abuse, DoS potential.

**Fix:** Install `@fastify/rate-limit` and configure for:
- Authentication endpoints (strict)
- All tRPC endpoints (moderate)

---

### 5. Database SSL Certificate Validation Disabled

**Location:** `server/lib/prisma.ts` (line 14)

```typescript
ssl: env.NODE_ENV === 'prod' ? { rejectUnauthorized: false } : false
```

**Risk:** Man-in-the-middle attacks on database connections.

**Fix:** Change to `{ rejectUnauthorized: true }` in production.

---

### 6. Cookie Security Only in Production

**Location:** `server/lib/auth.ts` (lines 42-52)

**Issue:** Cookie security attributes (`secure`, `sameSite`, `httpOnly`) only applied in production environment.

**Risk:** Development cookies vulnerable to XSS and CSRF.

**Fix:** Apply security attributes in all environments.

---

### 7. Session Tokens Stored in Plaintext

**Location:** Prisma schema - Session model

**Issue:** Session tokens stored as plaintext strings in database.

**Risk:** Database compromise exposes all session tokens.

**Fix:** Hash tokens before storage using bcrypt or similar.

---

## Medium Severity Issues

### 8. Theme Validation Too Permissive

**Location:** `shared/schemas/auth.schemas.ts` (line 37-39)

```typescript
export const updateThemeSchema = z.object({
  theme: z.string()  // Accepts any string
})
```

**Fix:** Use enum validation with valid faction names.

---

### 9. Error Messages Leak Resource Existence

**Locations:** Multiple service files

**Examples:**
- `Activity ${activityId} not found`
- `Character not found`
- `Habit ${id} not found`

**Risk:** Information disclosure - attackers can enumerate resources.

**Fix:** Use generic "Resource not found or access denied" messages.

---

### 10. Missing Database Indexes on userId Fields

**Location:** `server/prisma/schema.prisma`

**Tables affected:** Task, Habit, Objective, Area, HabitCompletion

**Risk:** Performance degradation, potential DoS under load.

**Fix:** Add `@@index([userId])` to these models.

---

### 11. Client-Side Cookies Missing Secure Flag

**Location:** `front/hooks/use-faction-theme.ts` (lines 51-52)

```typescript
document.cookie = `${STORAGE_KEY}=${value}; path=/; max-age=...; SameSite=Lax`
// Missing: Secure
```

**Fix:** Add `Secure` flag to client-side cookies.

---

## Low Severity Issues

### 12. No Audit Logging
Authentication events not logged. Implement logging for login attempts, session creation, account changes.

### 13. No Account Lockout
No failed login attempt tracking. Implement exponential backoff or lockout.

### 14. Type Safety Issues
Multiple uses of `as any` bypass TypeScript safety. Replace with proper types.

### 15. Excessive Console Logging
`console.error` in production may log sensitive data. Use structured logging.

---

## Positive Security Findings

1. **SQL Injection Prevention**: Prisma ORM used safely with parameterized queries
2. **Input Validation**: Zod schemas validate all inputs at router level
3. **Protected Procedures**: Consistent use of `protectedProcedure` for sensitive endpoints
4. **CORS Configuration**: Properly restricted to frontend origin only
5. **Modern Auth Library**: Better Auth provides secure defaults
6. **No XSS Found**: React escaping, no dangerous patterns
7. **Environment Validation**: Zod validation for env vars with min JWT secret length

---

## Recommended Fixes (Priority Order)

### Immediate (Before Production)
1. Add ownership validation to area/objective repository update/delete
2. Add character ownership checks in investment/activity routers
3. Fix database SSL validation (`rejectUnauthorized: true`)
4. Implement rate limiting

### Short-term (Within 1 Week)
5. Add userId parameter to `getCharacterById()`
6. Hash session tokens before storage
7. Apply cookie security in all environments
8. Fix theme validation schema
9. Add database indexes on userId fields

### Medium-term (Within 1 Month)
10. Generic error messages for not-found errors
11. Implement audit logging
12. Add security headers (CSP, HSTS)
13. Implement account lockout
14. Replace `as any` with proper types

---

## Files to Modify

| File | Changes |
|------|---------|
| `server/repositories/area.repository.ts` | Add userId to update/delete |
| `server/repositories/objective.repository.ts` | Add userId to update/delete/complete |
| `server/routers/investment.router.ts` | Add character ownership check |
| `server/routers/activity.router.ts` | Add character ownership check |
| `server/services/character.service.ts` | Add userId param to getCharacterById |
| `server/lib/prisma.ts` | Fix SSL validation |
| `server/lib/auth.ts` | Apply cookie security in all envs |
| `shared/schemas/auth.schemas.ts` | Enum for theme validation |
| `server/prisma/schema.prisma` | Add userId indexes |
| `front/hooks/use-faction-theme.ts` | Add Secure flag |
| `server/server.ts` | Add rate limiting |

---

## Verification

After implementing fixes:
1. Test authorization by attempting to access other users' resources
2. Verify rate limiting blocks excessive requests
3. Check cookie attributes in browser dev tools
4. Run Prisma migration for new indexes
5. Test SSL connection to database
