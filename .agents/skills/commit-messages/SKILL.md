---
name: commit-messages
description: Writes commit messages for home_renov in Conventional Commits format, and defines the branch and push policy. Use when creating a commit, when the user says "commit this", when writing a PR description, or when unsure whether pushing is allowed.
---

# Commit messages

## Policy first

- Work on a **branch**, never directly on `main`.
- **Never push and never open a PR unless explicitly asked.** Committing locally
  is fine when the user asks for a commit; sending anything to `origin` is a
  separate, explicit decision.
- `make check` must pass before committing. The pre-commit hook enforces this;
  `--no-verify` only defers the failure to CI.
- Changes to agent-control files (`AGENTS.md`, `.claude/**`, `.agents/**`,
  `.github/**`) go in their **own commit**, never mixed with feature work.

## Format

```
<type>(<scope>): <subject>

<body — why, not what>
```

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.
**Scopes:** `api`, `services`, `repositories`, `models`, `logging`, `config`,
`tests`, `frontend`, `harness`, `ci`.

**Subject:** imperative mood ("add", not "added" or "adds"), lowercase, no
trailing period, under 72 characters. It completes the sentence *"This commit
will…"*.

**Body:** optional, wrapped at 72 columns. Explain **why** the change was needed
and anything non-obvious about the approach — the diff already shows what
changed. Skip it for genuinely trivial commits.

## Rules

- One logical change per commit. If the subject needs "and", split it.
- Never mention Claude, an AI, or a prompt in the message. Describe the change.
- Do not pad with a body that restates the subject.

## Examples

```
feat(api): add room creation endpoint

Rooms are the top-level unit everything else hangs off, so this lands
before tasks and budget lines.
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
