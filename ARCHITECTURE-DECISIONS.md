# Architecture decisions

One row per decision. Record the choice, the reason, and **what would make it
worth revisiting** — a decision without a revisit trigger becomes dogma.
Superseded entries stay, marked `Superseded`, so the history survives.

---

### ADR-001 — Python + FastAPI for the backend
**Status:** Accepted · **Date:** 2026-09-08

Single Python service, run by uvicorn. FastAPI gives typed request/response
models via Pydantic and generates OpenAPI for free, which keeps the React client
honest.
**Revisit when:** the app needs long-lived connections or background scheduling
substantial enough to warrant a separate worker process.

---

### ADR-002 — `uv` instead of Poetry
**Status:** Accepted · **Date:** 2026-09-08

Replaced Poetry with `uv`: an order of magnitude faster, resolves and installs in
one tool, and manages the Python toolchain itself. `pyproject.toml` moved to
standard PEP 621 `[project]` metadata, so nothing is Poetry-specific any more.
`uv.lock` is committed and the Docker build uses `--frozen`.
**Revisit when:** never, realistically — but if `uv` stalls as a project, PEP 621
metadata means any modern installer can take over.

---

### ADR-003 — JSON files first, MongoDB later
**Status:** Accepted · **Date:** 2026-09-08

v1 persists to JSON files on disk. No server to run, no schema migrations, and
the data is inspectable in an editor while the domain model is still moving.
Records are shaped as documents (string UUID ids, embedded sub-objects) and all
access is behind a repository Protocol, so MongoDB is a new implementation of an
existing interface rather than a rewrite. → `docs/persistence-guide.md`
**Revisit when:** a collection outgrows a whole-file read-modify-write (roughly
low thousands of records), concurrent writers appear, or a query needs anything
beyond a full scan.

---

### ADR-004 — React + TypeScript on Vite, not Next.js
**Status:** Accepted · **Date:** 2026-09-08

Vite builds to static assets: the production runtime is only the browser, so
FastAPI stays the single server to deploy. Next.js would add a Node server
runtime in production and invite business logic to split across Python and
JavaScript.
**Revisit when:** the app needs SSR for load performance or public shareable
pages that must render without JS.

---

### ADR-005 — No user accounts in v1
**Status:** Accepted · **Date:** 2026-09-08

Single-user, local-first. No auth, no sessions, no multi-tenancy, no marketplace.
Every one of those would shape the data model, and building them speculatively
before the core renovation-tracking model is proven is the expensive mistake.
**Revisit when:** two people genuinely need to see the same renovation — that is
the point where multi-tenancy stops being speculative.

---

### ADR-006 — No spec-driven-development layer yet
**Status:** Superseded by ADR-008 · **Date:** 2026-09-08

Skipped per-feature `spec.md`/`plan.md`/`contract.md`. With the backend still a
skeleton, three synchronized documents per feature would cost more than the code,
and a stale contract is worse than none. `docs/plans/` covers proposals for now.
**Revisit when:** features stabilize and the team grows past one person —
OpenSpec or similar is the intended path.

---

### ADR-007 — gitleaks in the gate, not GitHub secret scanning
**Status:** Accepted · **Date:** 2026-09-08

Secret detection runs as part of `make check` (pre-commit) and again in CI,
using the gitleaks CLI plus ruff `S105`-`S107`. Before this, the harness had no
content-based secret detection at all: a file containing a live-format Stripe
key, an AWS secret and a hardcoded production database password passed the gate
and committed cleanly. Protection was purely path-based via `.gitignore`.

GitHub's push protection was the alternative, but it requires GitHub Secret
Protection (billed per committer) on private repos, only fires at push time
rather than before the commit exists, and matches vendor token formats only —
it would not have caught the `postgres://user:pass@host` case. gitleaks is MIT,
free, runs in ~30ms, and catches all of it. The binary is installed directly in
CI rather than via the official Action, which requires a paid license for
organization-owned repos.

Two custom rules were added after verifying the bundled ruleset missed them:
bare AWS access key IDs, and passwords embedded in connection URIs.

**Revisit when:** the repo moves to an organization with GitHub Advanced
Security already paid for — push protection then adds a server-side backstop
that a local hook cannot provide, and should run alongside this rather than
replace it.

---

### ADR-008 — OpenSpec as the change-proposal layer
**Status:** Accepted · **Date:** 2026-09-09 · **Supersedes:** ADR-006

ADR-006's revisit trigger fired sooner than expected: the expenses slice needed a
written intent before code, and got one. OpenSpec now owns proposals, tasks and
shipped requirements — `openspec/changes/<id>/` while in flight,
`openspec/changes/archive/` plus `openspec/specs/` once shipped.

It avoids what ADR-006 was actually afraid of. The cost there was *three*
synchronized documents per feature, kept current forever; here a change is
written once, archived on merge, and only its requirements survive into
`specs/`. Proposals are required for `feat/**` only, so a typo fix still costs
nothing.

`docs/plans/` is deleted — two planning homes meant neither was authoritative.
**Revisit when:** proposals start being written to satisfy the process rather
than to think, or the archive is consulted more often than `specs/`.

---

### ADR-009 — Trunk-based branches, squash-merged through a PR
**Status:** Accepted · **Date:** 2026-09-09

`main` is written to only by a squash-merged pull request that CI has passed.
Considered and rejected: merging locally, which is faster but skips the gate
outright — `.github/workflows/check.yml` triggers on `pull_request` and on push
to `main`, so a local merge runs nothing. History already contained one branch
merged that way and one through a PR.

Squash over merge commits because `git log main` should read as a list of
shipped changes; the branch's intermediate commits are working notes and stay
disposable. The cost is that a branch's individual commits are not preserved on
`main`, which is why the OpenSpec `Change:` trailer is repeated in the PR body —
squash keeps the PR body, not the branch commits.

Branch protection is not enforced for admins, deliberately: a required check
that never reports blocks merges *pending*, not failed, and an escape hatch
beats a repo nobody can merge into.
**Revisit when:** more than one person commits regularly — required reviews
currently sit at zero approvals so a solo merge is possible, and that is the
first setting that should change. → `docs/git-guide.md`
