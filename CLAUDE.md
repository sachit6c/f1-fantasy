# CLAUDE.md

Operational guide for Claude/Copilot when working in this repo.

## Deployment

Deployments go to **Vercel**, triggered automatically when `main` is pushed to GitHub.

The GitHub PAT lives in `~/.zshrc` as `$GITHUB_TOKEN` (user: `$GITHUB_USER` = `sachit6c`). Never commit the literal token.

**Always use this exact push command** (authenticated as `sachit6c`):

```bash
git push "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/sachit6c/F1-fantasy-league-v2.git" main --tags
```

### Release workflow

```bash
# 1. Make sure you're on main and it's clean
git checkout main
git status   # should be clean

# 2. Bump "version" in package.json to X.Y.Z

# 3. Commit, tag, and push
git add -A
git commit -m "chore: bump version to X.Y.Z"
git tag release-vX.Y HEAD
git push "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/sachit6c/F1-fantasy-league-v2.git" main --tags
```

### Before every deploy

Verify the build/tests pass locally:

```bash
npm run test:run && npm run test:e2e
```

> This repo has no `typecheck`/`lint`/`build` scripts (vanilla JS + static hosting). The Vitest + Playwright suites are the gate.

## Security

- The PAT is in `~/.zshrc` only — never paste it into source files, commit messages, or shared chats.
- If the token leaks, revoke it at https://github.com/settings/tokens and update `~/.zshrc`.
