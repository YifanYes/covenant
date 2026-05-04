# Spec Review

Review the spec file at $ARGUMENTS as a senior software engineer. Read it fully, then analyze each dimension below with systematic rigor.

## Review Dimensions

### 1. Internal Consistency

- Contradictions between sections (e.g., a schema defined one way in the data model and another in the API contract)
- Ambiguous terms used with different meanings in different places
- Requirements that mutually exclude each other
- Assumptions stated in one section that conflict with another

### 2. Architecture & Design

- Violations of separation of concerns or layering rules established in CLAUDE.md
- Inappropriate coupling between components or services
- Missing layers (e.g., business logic leaking into the router or repository)
- Over-engineering: abstractions introduced before they're needed
- Under-engineering: design that will clearly not survive growth (e.g., polling where events are needed, in-process state that must scale out)
- Misuse of existing patterns in the codebase (tRPC, service factory, repository pattern)

### 3. Data Model & Schema

- Fields that are nullable without justification, or non-nullable fields that should be optional
- Missing indexes for fields used in filters or joins
- N+1 query patterns baked into the design
- Schema decisions that will require painful migrations later (e.g., encoding multiple values in a single string field)
- Redundant data that will drift out of sync
- Missing cascades or incorrect delete behavior

### 4. Security

- Missing authentication or authorization checks
- Endpoints or fields that expose data across user/tenant boundaries
- Input validation gaps (especially where the spec says "validate on the frontend only")
- Business logic that can be bypassed by a malicious client
- Sensitive data (tokens, secrets, PII) stored or transmitted without justification

### 5. API & Contract Design

- Endpoints doing more than one thing (violating single-responsibility)
- Response shapes that will force multiple round-trips on the client
- Pagination, sorting, or filtering omitted on list endpoints that will have unbounded data
- Breaking changes to existing contracts not flagged as such
- Inconsistent naming conventions across endpoints or fields

### 6. State & Side Effects

- Race conditions in concurrent operations (e.g., two requests modifying the same resource)
- Missing idempotency on operations that will be retried
- Side effects (emails, webhooks, balance changes) not clearly sequenced relative to persistence
- Transactions not scoped correctly — too broad (locking too much) or too narrow (partial failure leaves inconsistent state)

### 7. Completeness & Gaps

- Flows that are described at a high level but have no concrete implementation detail where it's needed
- Error cases not specified (what happens when X fails?)
- Edge cases the spec author probably didn't consider
- Missing non-functional requirements: rate limits, timeouts, maximum sizes, SLA

### 8. Simplification Opportunities

- Steps or components that can be eliminated without loss of correctness
- Specs that describe custom infrastructure when an existing utility or library already solves the problem
- Over-specified implementation detail that constrains the implementer unnecessarily

## Output Format

For each finding:

- **Location**: section heading or line reference in the spec
- **Severity**: critical | high | medium | low | nitpick
- **Issue**: one-sentence description of the problem
- **Fix**: concrete recommendation

Conclude with a summary table: severity counts and overall verdict (ready to implement / implement with fixes / needs redesign).
