# Summarize Changes

Analyze the current git changes to propose a conventional-commits message,.

## Instructions

1. Run `git status --short` to see staged, unstaged, and untracked files
2. Run `git diff HEAD` to review changes
3. Read key changed files if scope unclear
4. Draft a single-line commit message following Conventional Commits:
   - `feat:` new features
   - `fix:` bug fixes
   - `refactor:` code restructuring
   - `docs:` documentation
   - `chore:` maintenance
   - `test:` tests
   - `style:` formatting
5. Show the proposed message to the user

## Rules

- Always create a single commit, even when the changes span multiple concerns or file types — do not split into multiple commits
- Never use `--no-verify` or skip hooks
- Keep the subject ≤72 chars, imperative mood, lowercase after the type
- If there are no changes, report that and stop — do not create an empty commit
