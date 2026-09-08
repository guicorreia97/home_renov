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
**Status:** Accepted · **Date:** 2026-09-08

Skipped per-feature `spec.md`/`plan.md`/`contract.md`. With the backend still a
skeleton, three synchronized documents per feature would cost more than the code,
and a stale contract is worse than none. `docs/plans/` covers proposals for now.
**Revisit when:** features stabilize and the team grows past one person —
OpenSpec or similar is the intended path.
