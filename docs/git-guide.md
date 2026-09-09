# Git workflow

How work becomes a branch, a commit, a pull request, and finally history.
Normative — this is the contract, not a suggestion. Message *formatting* lives
in `.agents/skills/commit-messages/SKILL.md`; everything about branches,
integration and cleanup lives here.

## The model

Trunk-based with short-lived branches. `main` is always releasable, and it is
only ever written to by a squash-merged pull request that CI has passed.

```
main ──●────────────────────────────●── squash merge, branch auto-deleted
        \                          /
         ●──●──●  chore/git-workflow
```

Three properties follow from that, and each one is load-bearing:

- **Every change is reviewed by CI.** `.github/workflows/check.yml` triggers on
  `pull_request` and on push to `main`. A branch merged locally never runs it.
  Merging locally is therefore not a shortcut — it is skipping the gate.
- **`main`'s history is one commit per change.** Squash-merge collapses the
  branch, so `git log main` reads as a list of shipped changes rather than a
  list of keystrokes. Work-in-progress commits stay honest because they are
  never permanent.
- **Merged branches delete themselves.** GitHub removes the head branch on
  merge; `git fetch --prune` removes your local tracking ref. Nothing
  accumulates, so nothing needs periodic auditing.

## Branch naming

```
<type>/<slug>
```

`<type>` is one of the commit types below and states the *nature* of the work.
`<slug>` is free-form kebab-case that states its *subject* — short, specific,
no ticket numbers, no dates, no author names.

```
feat/room-timeline        chore/git-workflow        fix/expense-date-parsing
```

The slug is deliberately **not** bound to an OpenSpec change ID. A branch and a
change are different things with different lifetimes — one branch can advance
two changes, and a change can outlive several branches. The link between them
is recorded per-commit instead, which survives squashing and stays true when
either side moves. See *Linking a branch to an OpenSpec change* below.

## When a change proposal is required

Tiered by branch type, so ceremony lands only where it pays for itself:

| Branch type | OpenSpec change required? |
|---|---|
| `feat/**` | **Yes** — propose before writing code |
| Anything that adds or alters a requirement in `openspec/specs/` | **Yes** |
| `fix/**`, `chore/**`, `docs/**`, `test/**`, `refactor/**`, `perf/**` | No |

"Required" means `openspec/changes/<change-id>/` exists with a proposal before
the first feature commit lands — use the `openspec-propose` skill. A fix that
turns out to need a spec change is no longer a fix; stop and propose.

## Linking a branch to an OpenSpec change

Every commit made under a required proposal carries a `Change:` trailer naming
the change ID, immediately above the attribution trailer:

```
feat(frontend): show budget used as a spend bar

The summary strip was inert on a fresh install because planned_budget
had no UI to set it.

Change: complete-expenses-ui
Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
```

The change ID is the directory name under `openspec/changes/` — and it stays
the same after archiving, when the directory moves to
`openspec/changes/archive/<date>-<change-id>/`.

This is enforced by `.githooks/commit-msg` and buys two queries:

```sh
git log --grep='^Change: complete-expenses-ui' --all   # every commit for a change
git log -1 --format=%B <sha> | grep '^Change:'         # what shipped in this commit
```

**Repeat the trailer in the pull request body.** Squash-merge writes the PR
title and body as the merge commit message, so a trailer that lives only on
branch commits is lost the moment it lands. The PR body is what survives.

## Lifecycle

| Stage | What happens | Who decides |
|---|---|---|
| 1. Branch | `git switch -c <type>/<slug>` off an up-to-date `main` | Agent |
| 2. Propose | For `feat/**`: `openspec-propose` before code | Agent |
| 3. Commit | `make check` green; hooks enforce format and trailer | Agent |
| 4. Push | `git push -u origin <branch>` — freely, no permission needed | Agent |
| 5. Pull request | `gh pr create` | **Human — ask first** |
| 6. Merge | Squash-merge, CI green | **Human only** |
| 7. Clean up | Branch auto-deletes; `git fetch --prune` locally | Automatic |
| 8. Archive | `openspec-archive-change` once merged | Agent |

Pushing a branch is cheap, reversible, and triggers no deploy — it is a backup,
not a publication, and needs no permission. A pull request is outward-facing:
it notifies people and asks for a decision. Never open one unprompted, and
never merge one.

## Never on main

Never commit directly to `main`, and never `git merge` a branch into it
locally. If you find yourself on `main` with uncommitted work:

```sh
git switch -c <type>/<slug>    # takes the changes with you
```

## Agent-control files

Changes to `AGENTS.md`, `CLAUDE.md`, `ARCHITECTURE-DECISIONS.md`, `.claude/**`,
`.agents/**`, `.github/**`, `.githooks/**`, `Makefile` and `docs/**` go in their
**own commit**, never mixed with feature work, and require an explicit request
(rule 8). They are owned in `.github/CODEOWNERS`, so a PR touching them requests
a human review automatically. Keeping them in a separate commit means that
review can be read without a feature diff around it.

## Branch protection

Configured on GitHub, not in this file. `main` currently requires:

| Setting | Value |
|---|---|
| Pull request required | yes — 0 approvals, so a solo merge is possible |
| CODEOWNERS review | required — agent-control files pull in a human |
| Status check `quality gate` | must pass, and the branch must be up to date with `main` |
| Linear history | required — the counterpart of squash-merge |
| Force-push / delete `main` | blocked |
| Enforced for admins | no — an escape hatch, deliberately left open |

The repository also allows **squash-merge only** and deletes the head branch on
merge. Verify with:

```sh
gh api repos/{owner}/{repo}/branches/main/protection
```

## Auditing

```sh
make branch-status
```

Lists every local and remote branch with its ahead/behind count against
`origin/main`, whether it is fully merged, and any open OpenSpec change. A
branch showing `0 ahead` is fully contained in `main` and safe to delete:

```sh
git branch -d <branch>                    # local; -d refuses if unmerged
git push origin --delete <branch>         # remote, if it still exists
git fetch --prune                         # drop stale tracking refs
```

## Stashes

A stash is a branch you forgot to make. It survives the deletion of the branch
it was created on, so it becomes an orphan with no name and no history — the
only pointer to work nobody can find.

Prefer a WIP commit on a real branch. If you do stash, name it and drain it in
the same session:

```sh
git stash push -m "expense form validation, mid-refactor"
git stash list                            # audit; anything old is suspect
```

Never drop a stash without inspecting it first — `git stash show -p --include-untracked stash@{0}`.

## Commit types and scopes

**Types:** `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`.

**Scopes** (optional, but use one when it fits): `api`, `services`,
`repositories`, `models`, `logging`, `config`, `tests`, `frontend`, `harness`,
`openspec`, `design`, `ci`.

Leave the scope off rather than forcing a bad one — `docs: add the git guide`
is valid. A scope is only worth adding when it names a distinct part of the
system; a second word for something an existing scope covers makes
`git log --grep` quietly incomplete, which is worse than no scope at all.

`harness` covers `AGENTS.md`, `.claude/`, `.agents/` and `.githooks/`. Use
`openspec` for changes under `openspec/`, and `design` for design sources under
`design/`. Both the type and the scope list are enforced by
`.githooks/commit-msg`; extend the lists here and in the hook together, in the
same commit.
