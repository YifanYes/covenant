# Summarize Changes

Analyze the current git changes and provide a concise commit message and PR description.

## Instructions

1. Run `git diff HEAD --stat` to see changed files
2. Run `git status --short` to identify new untracked files
3. Read key files to understand the scope of changes
4. Generate output in the following format:

## Output Format

### Commit Message

A single-line commit message following conventional commits:

- `feat:` for new features
- `fix:` for bug fixes
- `refactor:` for code restructuring
- `docs:` for documentation
- `chore:` for maintenance tasks

### PR Description

Bullet points covering:

- **Summary**: 3-5 bullets describing what changed
- **New Files**: List significant new files (if any)
- **Breaking Changes**: Note any breaking changes (if any)

Keep descriptions concise and focused on the "what" and "why", not implementation details.
