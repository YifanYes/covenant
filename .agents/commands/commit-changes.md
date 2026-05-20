# Summarize Changes

Analyze the current git changes to propose a conventional-commits message.

## Instructions

1. Run `git status --short` to see staged, unstaged, and untracked files
2. Run `git diff HEAD` to review changes
3. Read key changed files if scope unclear
4. Output a single-line commit message following Conventional Commits:
   - `feat:` new features
   - `fix:` bug fixes
   - `refactor:` code restructuring
   - `docs:` documentation
   - `chore:` maintenance
   - `test:` tests
   - `style:` formatting

## Rules

- Output only the commit message — no description, no body, no explanation
- Never stage changes (`git add`) and never commit (`git commit`)
- Keep the subject ≤72 chars, imperative mood, lowercase after the type
- If there are no changes, report that and stop
