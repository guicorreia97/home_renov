---
name: commit-messages
description: Writes commit messages for home_renov in Conventional Commits format. Use when creating a commit, when the user says "commit this", or when writing a PR description. Branch, push and merge policy lives in docs/git-guide.md.
---

# Commit messages

## Policy first

**`docs/git-guide.md` is the contract** for branching, pushing, merging and
cleanup. Read it before your first commit on a branch. In short:

- Work on a **branch**, never directly on `main`.
- **Never open a PR and never merge unless explicitly asked.** Pushing a branch
  to `origin` needs no permission — it is a backup, not a publication.
- `make check` must pass before committing. The pre-commit hook enforces this;
  `--no-verify` only defers the failure to CI.
- Changes to agent-control files (`AGENTS.md`, `.claude/**`, `.agents/**`,
  `.github/**`, `.githooks/**`, `Makefile`, `docs/**`) go in their **own
  commit**, never mixed with feature work.

## Format

```
<type>(<scope>): <subject>

<body — why, not what>

<trailers>
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.
**Scopes:** `api`, `services`, `repositories`, `models`, `logging`, `config`,
`tests`, `frontend`, `harness`, `openspec`, `design`, `ci`.

Both lists are enforced by `.githooks/commit-msg`. Extending either one means
editing the hook and `docs/git-guide.md` in the same commit.

**Subject:** imperative mood ("add", not "added" or "adds"), lowercase, no
trailing period, under 72 characters. It completes the sentence *"This commit
will…"*.

**Body:** optional, wrapped at 72 columns. Explain **why** the change was needed
and anything non-obvious about the approach — the diff already shows what
changed. Skip it for genuinely trivial commits.

## The `Change:` trailer

On a `feat/**` branch, every commit names the OpenSpec change it implements:

```
Change: <change-id>
```

`<change-id>` is the directory name under `openspec/changes/`. The commit-msg
hook rejects a feature commit without it, and rejects an ID that matches no
change. Repeat it in the PR body — squash-merge keeps the PR body, not the
branch commits. → `docs/git-guide.md`

## Rules

- One logical change per commit. If the subject needs "and", split it.
- Never mention Claude, an AI, or a prompt in the message. Describe the change.
- Do not pad with a body that restates the subject.

## Examples

```
feat(api): add room creation endpoint

Rooms are the top-level unit everything else hangs off, so this lands
before tasks and budget lines.

Change: add-rooms-crud
```

```
fix(repositories): write JSON atomically via temp file and rename

An interrupted write left rooms.json truncated and unparseable, taking
the whole app down on next boot.
```

```
chore(harness): scope test-writer subagent to tests/ only
```

## Attribution

End every commit message with:

```
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

PR descriptions (only when explicitly asked for one) end with:

```
🤖 Generated with [Claude Code](https://claude.com/claude-code)
```
