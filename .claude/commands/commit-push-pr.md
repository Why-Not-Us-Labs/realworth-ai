# /commit-push-pr

Commit all staged/unstaged changes, push to remote, and create a pull request.

## Pre-compute Context

```bash
git status
git diff --stat
git log -3 --oneline
git branch --show-current
```

## Instructions

1. Stage all changes: `git add .`
2. Create a commit with a descriptive message following conventional commits
3. Push to remote with upstream tracking: `git push -u origin <branch>`
4. Create PR using: `gh pr create --fill` or with title/body if significant changes
5. Return the PR URL

## Commit Message Format

```
<type>(<scope>): <description>

[optional body]

Generated with Claude Code
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

Types: feat, fix, docs, style, refactor, test, chore
