---
description: Implement a spec; log out-of-spec decisions to a co-located implementation notes file
argument-hint: <path-to-spec-file>
---

Read spec at `$ARGUMENTS`. Implement.

Maintain notes file co-located with spec. Spec `docs/specs/foo.md` → notes `docs/specs/foo-implementation.md`. Create on first entry if missing.

Append entry when you:

- Resolve spec ambiguity (what unclear, choice, why)
- Deviate from spec (what changed, why)
- Hit tradeoff (options, choice, rationale)
- Assume something spec didn't cover
- Hit blocker or open question for user

Entry format:

    ## <short title>
    **Category:** ambiguity | deviation | tradeoff | assumption | blocker
    **Context:** ...
    **Decision:** ...
    **Reason:** ...

Append as decisions happen, not at end. Surface blockers immediately. Don't guess.
