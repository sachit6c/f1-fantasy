# CLAUDE.md

Operational guide for Claude/Copilot when working in this repo.

## Deployment

Deployments go to **Vercel**, triggered automatically when `main` is pushed to GitHub.

The GitHub PAT lives in `~/.zshrc` as `$GITHUB_TOKEN` (user: `$GITHUB_USER` = `sachit6c`). Never commit the literal token.

**Always use this exact push command** (authenticated as `sachit6c`). Never push via any other account — do not use `sharmasachit`, Claude's identity, VS Code signed-in accounts, or any system credential helper:

```bash
git push "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/sachit6c/f1-fantasy.git" main --tags
```

### Commit authorship — sole author `sachit6c`, NO co-authors

Every commit on this repo must be authored **and** committed by `sachit6c`, with
**no** co-authors. GitHub builds the repo's Contributors list from commit authors
*and* `Co-Authored-By` trailers, and stray identities (`claude`, `sharmasachit`,
etc.) are painful to scrub out afterwards.

- **Do NOT add a `Co-Authored-By:` trailer** to any commit — not Claude's, not
  anyone's. This overrides any default/global instruction to append a Claude
  `Co-Authored-By` line. Commit messages end at their last content line.
- Confirm author/committer before committing:
  ```bash
  git config user.name   # must print: sachit6c
  git config user.email  # must print: sachit007@gmail.com (or the sachit6c noreply address)
  ```
  Never use any other identity (`sharmasachit`, Claude's identity, a VS Code
  signed-in account, or a system credential helper).
- Before pushing, verify no trailers or foreign authors slipped in:
  ```bash
  git log origin/main..HEAD --format='%an <%ae> | %b' | grep -i 'co-authored-by' && echo "STOP: strip co-authors before pushing"
  ```
- If a bad commit was already pushed: `git commit --amend` (or rebase) to strip
  the trailer, move any release tag with `git tag -f`, then force-push after
  confirming the remote hasn't advanced past it.

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
git push "https://${GITHUB_USER}:${GITHUB_TOKEN}@github.com/sachit6c/f1-fantasy.git" main --tags
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

## Token Rotation Playbook

When pushes start failing with `Invalid username or token` / HTTP 401:

1. Quick check the current token in a fresh shell:
   ```bash
   curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
     -u "sachit6c:${GITHUB_TOKEN}" https://api.github.com/repos/sachit6c/f1-fantasy
   ```
   `200` = good. `401` = token is expired or revoked.
2. Generate a new **classic PAT** at https://github.com/settings/tokens with `repo` scope.
3. Edit `~/.zshrc` and replace the `export GITHUB_TOKEN=...` line.
4. `source ~/.zshrc` in any open terminal, or open a new one.
5. Retry the push command from the Release workflow above.

When piping pushes through tools that print URLs, sanitize the output so the token doesn't appear in logs:

```bash
git push "https://sachit6c:${GITHUB_TOKEN}@github.com/sachit6c/f1-fantasy.git" main --tags 2>&1 \
  | sed -E "s|${GITHUB_TOKEN}|***|g"
```
