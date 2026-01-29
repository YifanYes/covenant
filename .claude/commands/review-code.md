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

### 3. Performance

- Algorithmic complexity concerns
- Unnecessary allocations, copies, or computations
- N+1 queries, missing indexes, unbounded operations
- Resource leaks (memory, handles, connections)

### 4. Maintainability

- Naming clarity and consistency
- Function/method length and responsibility
- Coupling, cohesion, abstraction levels
- Dead code, duplication, magic values

### 5. Error Handling

- Swallowed exceptions, silent failures
- Error message quality and actionability
- Recovery strategies and cleanup

### 6. Testing Implications

- Untestable patterns (hidden dependencies, global state)
- Missing validation points
- Suggested test cases for critical paths

## Output Format

For each finding:

- **Location**: file:line or function name
- **Severity**: critical | high | medium | low | nitpick
- **Issue**: one-sentence description
- **Fix**: concrete remediation

Conclude with a summary table: severity counts and overall assessment (ship / ship with fixes / needs rework).
