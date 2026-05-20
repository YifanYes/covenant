# Code Review

As a senior software engineer, perform a code review on the current changes with systematic rigor. Analyze each dimension independently.

## Review Dimensions

### 1. Correctness

- Logic errors, off-by-one mistakes, race conditions
- Unhandled edge cases and failure modes
- Contract violations (preconditions, postconditions, invariants)

### 2. Security

- Injection vectors (SQL, XSS, command, path traversal)
- Authentication/authorization gaps
- Sensitive data exposure, insecure defaults
- Dependency vulnerabilities if identifiable

### 3. Maintainability

- Naming clarity and consistency: variables, functions, and types should be meaningful, intention-revealing, and consistent with surrounding code
- Function/method length and responsibility: functions should be short, focused, and do one thing
- Coupling, cohesion, abstraction levels
- Dead code, duplication, magic values: extract shared logic rather than copy-pasting; replace magic values with named constants
- Comment quality: comments should explain _why_, not _what_; ensure they are accurate and not misleading

### 4. Code Style & Conventions

- Adherence to project coding conventions (naming, formatting, file structure)
- Consistent use of language idioms and patterns already established in the codebase
- No unnecessary abstraction or premature generalization

### 5. Error Handling

- Swallowed exceptions, silent failures
- Error message quality and actionability
- Recovery strategies and cleanup
- Graceful degradation: errors should be handled at the right level and not leak implementation details

### 6. Testing Implications

- Untestable patterns (hidden dependencies, global state)
- Missing validation points
- Test coverage of critical paths, edge cases, and failure modes
- Tests should be thorough enough to catch regressions

### 7. Performance

- Algorithmic complexity concerns
- Unnecessary allocations, copies, or computations
- N+1 queries, missing indexes, unbounded operations
- Resource leaks (memory, handles, connections)
- Optimize only where it matters — flag premature optimization as a nitpick

### 8. Covenant-Specific Checks

Project conventions and recurring footguns. Flag any of these as `high` unless context overrides.

- **Layering**: routers must stay thin and delegate to services. No business logic in routers or repositories. Repositories must extend `BaseRepository<T>` or `UserScopedRepository<T>`.
- **ServiceFactory registration**: any new service in `src/server/services/` must be registered in `src/server/services/service.factory.ts` with a lazy `??=` getter. Missing registration = unreachable service.
- **Prisma import**: import from `@/generated/prisma`, never `@prisma/client`.
- **Better Auth user IDs are `text`**: in raw SQL, `userId::uuid` will throw `invalid input syntax for type uuid`. Entity `id` columns are uuid and may be cast.
- **tRPC client usage**: `trpcOptions.*.queryOptions()` / `.mutationOptions()` for hooks; `trpc.*.queryKey()` only for invalidation. `trpc.*.queryOptions()` is wrong.
- **`Omit<>` on procedure types**: breaks implicit tRPC type resolution. Flag and suggest a different shape.
- **`setState` in `useEffect`**: synchronous `setState` inside `useEffect` triggers cascading renders and fails `react-hooks/set-state-in-effect`. Use lazy `useState(() => ...)` instead.
- **i18n parity**: any user-facing string must come from `useTranslation()` and have keys present in BOTH `public/locales/en/translation.json` AND `public/locales/es/translation.json`. Drift between locales or hardcoded strings = `high`.
- **Copy tone**: user-facing empty states and microcopy follow a friendly, funny, energetic RPG tone. Dry corporate copy is a `low` finding.
- **File naming**: kebab-case with the right suffix (`.component.tsx`, `.router.ts`, `.service.ts`, `.repository.ts`, `.utils.ts`, `.store.ts`). Hooks named `use-*.ts`.
- **Imports**: path aliases only (`@/*`, `@shared/*`, `@ui/*`). Relative imports across module boundaries = `medium`.
- **Types from Zod**: prefer `z.infer<typeof schema>` over hand-declared duplicates of validated shapes.

## Output Format

For each finding:

- **Location**: file:line or function name
- **Severity**: critical | high | medium | low | nitpick
- **Issue**: one-sentence description
- **Fix**: concrete remediation

Conclude with a summary table: severity counts and overall assessment (ship / ship with fixes / needs rework).
