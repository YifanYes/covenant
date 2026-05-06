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
- Comment quality: comments should explain *why*, not *what*; ensure they are accurate and not misleading

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

## Output Format

For each finding:

- **Location**: file:line or function name
- **Severity**: critical | high | medium | low | nitpick
- **Issue**: one-sentence description
- **Fix**: concrete remediation

Conclude with a summary table: severity counts and overall assessment (ship / ship with fixes / needs rework).
